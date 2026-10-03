import { apiClient } from './client';

export interface AIParseResponse {
  status: 'confirmed' | 'needs_clarification' | 'error';
  confidence: number;
  expense_type?: 'personal' | 'group' | 'friend';
  amount?: number;
  category?: string;
  note?: string;
  expense_date?: string;
  group_id?: string;
  group_name?: string;
  friend_id?: string;
  friend_name?: string;
  paid_by?: string;
  split_type?: 'equal' | 'full' | 'custom';
  clarification_question?: string;
  clarification_options?: string[];
  ai_understanding?: string;
  transcribed_text?: string;
}

export interface ParseExpenseParams {
  text?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export const aiApi = {
  /**
   * Parse expense intent from natural language text.
   * Sends JSON request with conversation history for multi-turn disambiguation.
   */
  async parseExpense(params: ParseExpenseParams): Promise<AIParseResponse> {
    return await apiClient.post<any, AIParseResponse>(
      '/api/v1/ai/parse-expense',
      {
        text: params.text || '',
        conversation_history: params.conversationHistory || [],
      }
    );
  },
};

