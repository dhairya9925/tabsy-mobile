import { apiClient } from './client';
import {
  FriendRecord,
  FriendBalance,
  FriendProfile,
  FriendExpenseFeedItem,
  FriendExpenseCreate,
  FriendExpenseUpdate,
  ProfileSearchResult,
  CreateShadowProfileRequest,
  CreateShadowProfileResponse,
} from '../types';
import { toLocalDateString } from '../utils/formatters';

export const friendsApi = {
  getFriends: async (): Promise<FriendRecord[]> => {
    const res: any = await apiClient.get('/api/v1/friends/?status=accepted');
    return Array.isArray(res) ? res : [];
  },

  getPendingRequests: async (): Promise<FriendRecord[]> => {
    const res: any = await apiClient.get('/api/v1/friends/?status=pending');
    return Array.isArray(res) ? res : [];
  },

  getSentRequests: async (): Promise<FriendRecord[]> => {
    const res: any = await apiClient.get('/api/v1/friends/?status=sent');
    return Array.isArray(res) ? res : [];
  },

  getFriendBalances: async (): Promise<FriendBalance[]> => {
    const res: any = await apiClient.get('/api/v1/friends/balances');
    return Array.isArray(res) ? res : [];
  },

  searchUserByEmail: async (email: string): Promise<ProfileSearchResult | null> => {
    const res: any = await apiClient.get(
      `/api/v1/users/lookup?email=${encodeURIComponent(email.trim().toLowerCase())}`
    );
    return res ?? null;
  },

  sendFriendRequest: async (friendUserId: string): Promise<FriendRecord> => {
    const res: any = await apiClient.post('/api/v1/friends/request', {
      user_id: friendUserId,
    });
    return res;
  },

  createShadowProfile: async (
    payload: CreateShadowProfileRequest
  ): Promise<CreateShadowProfileResponse> => {
    const res: any = await apiClient.post('/api/v1/friends/shadow', {
      display_name: payload.display_name.trim(),
      email: payload.email.trim(),
    });
    return res;
  },

  acceptFriendRequest: async (friendshipId: string): Promise<FriendRecord> => {
    const res: any = await apiClient.post(`/api/v1/friends/${friendshipId}/accept`);
    return res;
  },

  rejectFriendRequest: async (friendshipId: string): Promise<FriendRecord> => {
    const res: any = await apiClient.post(`/api/v1/friends/${friendshipId}/reject`);
    return res;
  },

  removeFriend: async (friendshipId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/friends/${friendshipId}`);
  },

  getFriendProfile: async (friendId: string): Promise<FriendProfile> => {
    const res: any = await apiClient.get(`/api/v1/friends/${friendId}/profile`);
    return res;
  },

  getFriendExpenses: async (friendId: string): Promise<FriendExpenseFeedItem[]> => {
    const res: any = await apiClient.get(`/api/v1/friends/${friendId}/expenses`);
    return Array.isArray(res) ? res : [];
  },

  createFriendExpense: async (
    friendId: string,
    data: FriendExpenseCreate
  ): Promise<any> => {
    const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, data);
    return res;
  },

  updateFriendExpense: async (
    friendId: string,
    expenseId: string,
    data: FriendExpenseUpdate
  ): Promise<any> => {
    const res: any = await apiClient.patch(
      `/api/v1/friends/${friendId}/expenses/${expenseId}`,
      data
    );
    return res;
  },

  deleteFriendExpense: async (
    friendId: string,
    expenseId: string
  ): Promise<void> => {
    await apiClient.delete(`/api/v1/friends/${friendId}/expenses/${expenseId}`);
  },

  recordFriendPayment: async (
    friendId: string,
    amount: number,
    payerId?: string
  ): Promise<any> => {
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const formattedDate = toLocalDateString(new Date());

    const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, {
      amount,
      category: 'payment',
      note: 'Settlement payment',
      expense_date: formattedDate,
      paid_by: payerId || undefined,
      split_type: 'full',
    });

    return res;
  },
};
