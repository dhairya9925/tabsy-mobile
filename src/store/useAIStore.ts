import { create } from 'zustand';
import { aiApi, AIParseResponse } from '../api/ai';

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
  error: string | null;
  pendingConfirmation: AIParseResponse | null;

  // Actions
  sendMessage: (params: { text?: string; audioUri?: string }) => Promise<void>;
  selectOption: (option: string) => Promise<void>;
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
          content: "Here's what I understood! Review the details below:",
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
      error: null,
      pendingConfirmation: null,
    });
  },
}));
