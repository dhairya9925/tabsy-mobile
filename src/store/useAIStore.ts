import { create } from 'zustand';
import { aiApi, AIParseResponse } from '../api/ai';
import { expensesApi } from '../api/expenses';
import { groupsApi } from '../api/groups';
import { friendsApi } from '../api/friends';
import { splitEqual } from '../utils/money';
import { useAuthStore } from './useAuthStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isVoice?: boolean;
  parsedExpense?: AIParseResponse;
  clarificationOptions?: string[];
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

    // 1. Add user message optimistically
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

    // 2. Build conversation history for multi-turn context
    const currentMessages = get().messages;
    const history = currentMessages
      .filter((m) => m.id !== 'greeting')
      .map((m) => ({
        role: m.role,
        content: m.content,
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

        set((state) => ({
          isLoading: false,
          messages: [...state.messages, assistantMsg],
          pendingConfirmation: response,
        }));
      } else if (response.status === 'needs_clarification') {
        let msgContent = response.clarification_question || 'Could you provide a few more details?';
        if (response.ai_understanding) {
          msgContent = `${response.ai_understanding}\n\n${msgContent}`;
        }

        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: msgContent,
          timestamp: Date.now(),
          clarificationOptions: response.clarification_options || [],
          isClarification: true,
        };

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

        set((state) => ({
          isLoading: false,
          messages: [...state.messages, assistantMsg],
          pendingConfirmation: null,
        }));
      }
    } catch (err: any) {
      const errorText = err.message || 'Unable to connect to AI assistant.';
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
      const errMsg = err.message || 'Failed to save expense. Please retry.';
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
