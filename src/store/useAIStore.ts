import { create } from 'zustand';
import { aiApi, AIParseResponse } from '../api/ai';
import { expensesApi } from '../api/expenses';
import { groupsApi } from '../api/groups';
import { friendsApi } from '../api/friends';
import { splitEqual } from '../utils/money';
import { useAuthStore } from './useAuthStore';
import { haptics } from '../utils/haptics';
import { analytics } from '../utils/analytics';
import { offlineQueue } from '../utils/offlineQueue';


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isVoice?: boolean;
  parsedExpense?: AIParseResponse;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  aiUnderstanding?: string;
  isClarification?: boolean;
}

interface AIState {
  messages: ChatMessage[];
  isLoading: boolean;
  isConfirming: boolean;
  error: string | null;
  pendingConfirmation: AIParseResponse | null;

  // Actions
  sendMessage: (params: { text?: string; audioUri?: string }) => Promise<void>;
  selectOption: (option: string) => Promise<void>;
  confirmExpense: (expense: AIParseResponse, onSuccess?: () => void) => Promise<boolean>;
  cancelConfirmation: () => void;
  clearChat: () => void;
  setError: (err: string | null) => void;
}

const INITIAL_GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hi! I'm your Tabsy Assistant. Speak or type to record an expense — for example:\n\n• \"Spent 200 on lunch\"\n• \"Split 600 with Rahul for dinner\"\n• \"Add 1200 groceries to Goa Trip\"",
  timestamp: Date.now(),
};

export const useAIStore = create<AIState>((set, get) => ({
  messages: [INITIAL_GREETING],
  isLoading: false,
  isConfirming: false,
  error: null,
  pendingConfirmation: null,

  setError: (err) => set({ error: err }),

  sendMessage: async ({ text, audioUri }) => {
    const trimmedText = text?.trim();
    if (!trimmedText && !audioUri) return;

    set({ error: null, isLoading: true });

    // 1. Snapshot previous history before adding current message for clean multi-turn dialogue
    const priorMessages = get().messages;
    const history = priorMessages
      .filter((m) => m.id !== 'greeting')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // 2. Add user message optimistically
    const userMsgId = `user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmedText || '🎤 Processing voice recording...',
      timestamp: Date.now(),
      isVoice: !!audioUri,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      pendingConfirmation: null, // Reset previous pending confirmation on new prompt
    }));

    try {
      const response = await aiApi.parseExpense({
        text: trimmedText,
        audioUri,
        conversationHistory: history,
      });

      // If voice was transcribed, update user's bubble with transcribed text
      if (audioUri && response.transcribed_text) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === userMsgId
              ? { ...m, content: `🎤 "${response.transcribed_text}"` }
              : m
          ),
        }));
      }

      // 3. Handle AI Response Status
      const assistantMsgId = `assistant_${Date.now()}`;

      if (response.status === 'confirmed') {
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: "Here's what I understood! Review and confirm the details below:",
          timestamp: Date.now(),
          parsedExpense: response,
        };

        analytics.track('ai_expense_parsed', {
          type: response.expense_type,
          confidence: response.confidence,
          isVoice: Boolean(audioUri),
        });

        set((state) => ({
          isLoading: false,
          messages: [...state.messages, assistantMsg],
          pendingConfirmation: response,
        }));
      } else if (response.status === 'needs_clarification') {
        const question =
          response.clarification_question || 'Could you provide a few more details?';
        const understanding = response.ai_understanding || undefined;

        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: question,
          timestamp: Date.now(),
          clarificationQuestion: question,
          clarificationOptions: response.clarification_options || [],
          aiUnderstanding: understanding,
          isClarification: true,
        };

        analytics.track('ai_clarification_shown', {
          options_count: response.clarification_options?.length || 0,
        });

        set((state) => ({
          isLoading: false,
          messages: [...state.messages, assistantMsg],
          pendingConfirmation: null,
        }));
      } else {
        // Error or fallback
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content:
            response.clarification_question ||
            "I couldn't quite process that. Please try rephrasing or enter the expense manually.",
          timestamp: Date.now(),
        };

        analytics.track('ai_fallback_triggered', { reason: 'unrecognized_parse' });

        set((state) => ({
          isLoading: false,
          messages: [...state.messages, assistantMsg],
          pendingConfirmation: null,
        }));
      }
    } catch (err: any) {
      const errorText = err.message || 'Unable to connect to AI assistant.';
      haptics.error();
      analytics.track('ai_fallback_triggered', { error: errorText });

      set((state) => ({
        isLoading: false,
        error: errorText,
        messages: [
          ...state.messages,
          {
            id: `assistant_err_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${errorText}\nPlease try again in a moment.`,
            timestamp: Date.now(),
          },
        ],
      }));
    }
  },

  selectOption: async (option: string) => {
    haptics.selection();
    analytics.track('ai_clarification_answered', { mode: 'chip' });
    await get().sendMessage({ text: option });
  },


  confirmExpense: async (expense: AIParseResponse, onSuccess?: () => void): Promise<boolean> => {
    set({ isConfirming: true, error: null });

    const expenseType = expense.expense_type || 'personal';
    const amount = Number(expense.amount) || 0;
    const category = expense.category || 'other';
    const note = expense.note?.trim() || undefined;
    const expense_date = expense.expense_date || new Date().toISOString().split('T')[0];

    try {
      if (expenseType === 'group' && expense.group_id) {
        // 1. Group Expense Submission with equal split calculation
        const members = await groupsApi.getGroupMembers(expense.group_id);
        const count = members.length > 0 ? members.length : 1;
        const shares = splitEqual(amount, count);
        const splits = members.map((m, idx) => ({
          user_id: m.user_id,
          amount: shares[idx] || 0,
        }));

        await groupsApi.createGroupExpense(expense.group_id, {
          amount,
          category,
          note,
          expense_date,
          splits,
        });
      } else if (expenseType === 'friend' && expense.friend_id) {
        // 2. Friend Expense Submission
        const currentUserId =
          useAuthStore.getState().user?.id ||
          useAuthStore.getState().user?.user_id ||
          'self';
        const payerId = expense.paid_by === 'friend' ? expense.friend_id : currentUserId;

        await friendsApi.createFriendExpense(expense.friend_id, {
          amount,
          category,
          note,
          expense_date,
          paid_by: payerId,
          split_type: expense.split_type === 'full' ? 'full' : 'equal',
        });
      } else {
        // 3. Personal Expense Submission
        await expensesApi.createPersonalExpense({
          amount,
          category,
          note,
          expense_date,
        });
      }

      // Record success in conversation and clear pending confirmation
      const targetName =
        expenseType === 'group'
          ? ` in ${expense.group_name || 'Group'}`
          : expenseType === 'friend'
          ? ` with ${expense.friend_name || 'Friend'}`
          : ' to your journal';

      const successMsg: ChatMessage = {
        id: `confirmed_${Date.now()}`,
        role: 'assistant',
        content: `✅ Recorded ${expenseType} expense of ₹${amount.toFixed(2)} (${category})${targetName}!`,
        timestamp: Date.now(),
      };

      haptics.success();
      analytics.track('ai_expense_confirmed', {
        amount,
        expense_type: expenseType,
        category,
      });

      set((state) => ({
        isConfirming: false,
        pendingConfirmation: null,
        messages: [...state.messages, successMsg],
      }));

      if (onSuccess) {
        onSuccess();
      }
      return true;
    } catch (err: any) {
      // Check if this failure is specifically network/offline related
      const isNetworkError =
        err.isOffline === true ||
        err.code === 'ERR_NETWORK' ||
        (Boolean(err.isAxiosError) && (!err.response || err.code === 'ECONNABORTED')) ||
        err.message?.toLowerCase().includes('network error') ||
        err.message?.toLowerCase().includes('offline') ||
        err.message?.toLowerCase().includes('failed to fetch');

      if (isNetworkError) {
        await offlineQueue.queueExpense({
          expense_type: expenseType,
          amount,
          category,
          note,
          expense_date,
          group_id: expense.group_id,
          friend_id: expense.friend_id,
          paid_by: expense.paid_by,
          split_type: expense.split_type,
        });

        haptics.warning();
        analytics.track('offline_expense_queued', {
          amount,
          expense_type: expenseType,
        });

        const offlineMsg: ChatMessage = {
          id: `offline_queued_${Date.now()}`,
          role: 'assistant',
          content: `📡 You appear to be offline. I've safely queued this ₹${amount.toFixed(2)} expense on your device. It will automatically sync when connection returns!`,
          timestamp: Date.now(),
        };

        set((state) => ({
          isConfirming: false,
          pendingConfirmation: null,
          messages: [...state.messages, offlineMsg],
        }));

        if (onSuccess) {
          onSuccess();
        }
        return true;
      }

      const errMsg = err.message || 'Failed to save expense. Please retry.';
      haptics.error();
      analytics.track('ai_fallback_triggered', { error: errMsg });

      set((state) => ({
        isConfirming: false,
        error: errMsg,
        messages: [
          ...state.messages,
          {
            id: `confirm_err_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Error saving expense: ${errMsg}\nPlease review the details above and tap Confirm & Save again.`,
            timestamp: Date.now(),
          },
        ],
      }));
      return false;
    }
  },

  cancelConfirmation: () => {
    haptics.warning();
    set((state) => ({
      pendingConfirmation: null,
      messages: [
        ...state.messages,
        {
          id: `cancel_${Date.now()}`,
          role: 'assistant',
          content: 'No problem, expense cancelled. What else would you like to record?',
          timestamp: Date.now(),
        },
      ],
    }));
  },


  clearChat: () => {
    set({
      messages: [{ ...INITIAL_GREETING, timestamp: Date.now() }],
      isLoading: false,
      isConfirming: false,
      error: null,
      pendingConfirmation: null,
    });
  },
}));
