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
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { outboxService } from '../services/offline/outboxService';
import { networkService } from '../services/offline/networkService';

export const friendsApi = {
  getFriends: async (): Promise<FriendRecord[]> => {
    if (!networkService.isOnline()) {
      const cached = await cacheService.get<FriendRecord[]>(CACHE_KEYS.FRIENDS_LIST);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }

    try {
      const res: any = await apiClient.get('/api/v1/friends/?status=accepted');
      const friends = Array.isArray(res) ? res : [];
      if (friends.length > 0) {
        await cacheService.set(CACHE_KEYS.FRIENDS_LIST, friends);
      }
      return friends;
    } catch (err) {
      const cached = await cacheService.get<FriendRecord[]>(CACHE_KEYS.FRIENDS_LIST);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      return [];
    }
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
    if (!networkService.isOnline()) {
      const cached = await cacheService.get<FriendBalance[]>(CACHE_KEYS.FRIEND_BALANCES);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }

    try {
      const res: any = await apiClient.get('/api/v1/friends/balances');
      const balances = Array.isArray(res) ? res : [];
      if (balances.length > 0) {
        await cacheService.set(CACHE_KEYS.FRIEND_BALANCES, balances);
      }
      return balances;
    } catch (err) {
      const cached = await cacheService.get<FriendBalance[]>(CACHE_KEYS.FRIEND_BALANCES);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      return [];
    }
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
    if (!networkService.isOnline()) {
      const tempId = outboxService.generateTempId('temp-frd-exp');
      await outboxService.enqueue('create_friend_expense', { friendId, payload: data }, tempId);
      await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
      await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
      return {
        id: tempId,
        friend_id: friendId,
        amount: data.amount,
        category: data.category,
        note: data.note,
        expense_date: data.expense_date,
        paid_by: data.paid_by,
        split_type: data.split_type,
        created_at: new Date().toISOString(),
      };
    }

    try {
      const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, data);
      await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
      await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        const tempId = outboxService.generateTempId('temp-frd-exp');
        await outboxService.enqueue('create_friend_expense', { friendId, payload: data }, tempId);
        return {
          id: tempId,
          friend_id: friendId,
          amount: data.amount,
          category: data.category,
          note: data.note,
          expense_date: data.expense_date,
          paid_by: data.paid_by,
          split_type: data.split_type,
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
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
