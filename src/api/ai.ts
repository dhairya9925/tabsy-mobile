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
  audioUri?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

/**
 * Format audio file URI for multipart upload.
 * iOS native FormData requires removing the 'file://' prefix.
 */
function normalizeAudioUri(uri: string): string {
  if (
    uri.startsWith('file://') &&
    (uri.includes('/Containers/Data/') ||
      uri.includes('/Application/') ||
      uri.includes('/var/mobile/') ||
      uri.includes('/Users/'))
  ) {
    return uri.replace('file://', '');
  }
  return uri;
}

export const aiApi = {
  /**
   * Parse expense intent from natural language text or voice recording audio.
   * Sends JSON for text-only queries, or multipart/form-data when audio is included.
   */
  async parseExpense(params: ParseExpenseParams): Promise<AIParseResponse> {
    if (params.audioUri) {
      const formData = new FormData();
      const uri = params.audioUri;
      const filename = uri.split('/').pop() || 'recording.m4a';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/m4a';

      formData.append('audio', {
        uri: normalizeAudioUri(uri),
        name: filename,
        type,
      } as any);

      if (params.text) {
        formData.append('text', params.text);
      }

      if (params.conversationHistory && params.conversationHistory.length > 0) {
        formData.append(
          'conversation_history',
          JSON.stringify(params.conversationHistory)
        );
      }

      return await apiClient.post<any, AIParseResponse>(
        '/api/v1/ai/parse-expense',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
    }

    // Text-only mode: clean application/json payload
    return await apiClient.post<any, AIParseResponse>(
      '/api/v1/ai/parse-expense',
      {
        text: params.text || '',
        conversation_history: params.conversationHistory || [],
      }
    );
  },
};
