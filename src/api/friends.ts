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
    const cached = await cacheService.get<FriendRecord[]>(CACHE_KEYS.FRIENDS_LIST);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get('/api/v1/friends/?status=accepted');
      const friends = Array.isArray(res) ? res : [];
      await cacheService.set(CACHE_KEYS.FRIENDS_LIST, friends);
      return friends;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  getPendingRequests: async (): Promise<FriendRecord[]> => {
    const cached = await cacheService.get<FriendRecord[]>(CACHE_KEYS.PENDING_FRIEND_REQUESTS);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get('/api/v1/friends/?status=pending');
      const requests = Array.isArray(res) ? res : [];
      await cacheService.set(CACHE_KEYS.PENDING_FRIEND_REQUESTS, requests, 5 * 60 * 1000);
      return requests;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  getSentRequests: async (): Promise<FriendRecord[]> => {
    const cached = await cacheService.get<FriendRecord[]>(CACHE_KEYS.SENT_FRIEND_REQUESTS);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get('/api/v1/friends/?status=sent');
      const requests = Array.isArray(res) ? res : [];
      await cacheService.set(CACHE_KEYS.SENT_FRIEND_REQUESTS, requests, 5 * 60 * 1000);
      return requests;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  getFriendBalances: async (): Promise<FriendBalance[]> => {
    const cached = await cacheService.get<FriendBalance[]>(CACHE_KEYS.FRIEND_BALANCES);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get('/api/v1/friends/balances');
      const balances = Array.isArray(res) ? res : [];
      await cacheService.set(CACHE_KEYS.FRIEND_BALANCES, balances);
      return balances;
    } catch (err) {
      return hasCached ? cached! : [];
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
    const cacheKey = CACHE_KEYS.FRIEND_PROFILE(friendId);
    const cached = await cacheService.get<FriendProfile>(cacheKey);

    if (!networkService.isOnline()) {
      if (cached) return cached;
      throw new Error('Offline — no cached friend profile');
    }

    try {
      const res: any = await apiClient.get(`/api/v1/friends/${friendId}/profile`);
      if (res) {
        await cacheService.set(cacheKey, res);
      }
      return res;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  },

  getFriendExpenses: async (friendId: string): Promise<FriendExpenseFeedItem[]> => {
    const cacheKey = CACHE_KEYS.FRIEND_EXPENSES(friendId);
    const cached = await cacheService.get<FriendExpenseFeedItem[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/friends/${friendId}/expenses`);
      const expenses = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, expenses);
      return expenses;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  createFriendExpense: async (
    friendId: string,
    data: FriendExpenseCreate
  ): Promise<any> => {
    const cacheKey = CACHE_KEYS.FRIEND_EXPENSES(friendId);

    const handleOptimisticCreate = async (): Promise<any> => {
      const tempId = outboxService.generateTempId('temp-frd-exp');
      await outboxService.enqueue('create_friend_expense', { friendId, payload: data }, tempId);
      const optimistic: any = {
        id: tempId,
        friend_id: friendId,
        user_id: '',
        amount: data.amount,
        category: data.category,
        note: data.note || null,
        expense_date: data.expense_date,
        paid_by: data.paid_by,
        created_at: new Date().toISOString(),
        edited_at: null,
        expense_splits: [],
        is_pending_sync: true,
      };
      const cached = (await cacheService.get<FriendExpenseFeedItem[]>(cacheKey)) || [];
      await cacheService.set(cacheKey, [optimistic, ...cached]);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticCreate();
    }

    try {
      const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, data);
      const cached = await cacheService.get<FriendExpenseFeedItem[]>(cacheKey);
      if (Array.isArray(cached) && res) {
        await cacheService.set(cacheKey, [res, ...cached]);
      }
      await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
      await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticCreate();
      }
      throw err;
    }
  },

  updateFriendExpense: async (
    friendId: string,
    expenseId: string,
    data: FriendExpenseUpdate
  ): Promise<any> => {
    const cacheKey = CACHE_KEYS.FRIEND_EXPENSES(friendId);

    const handleOptimisticUpdate = async (): Promise<any> => {
      // 1. If pending create in outbox, merge updates
      const updatedPending = await outboxService.updatePendingPayload(
        (a) => a.type === 'create_friend_expense' && a.tempId === expenseId,
        (current: any) => ({
          ...current,
          payload: { ...(current.payload || {}), ...data },
        })
      );

      // If not pending create, enqueue update
      if (!updatedPending) {
        const updatedExisting = await outboxService.updatePendingPayload(
          (a) =>
            a.type === 'update_friend_expense' &&
            a.payload?.friendId === friendId &&
            a.payload?.expenseId === expenseId,
          (current: any) => ({
            ...current,
            payload: { ...(current.payload || {}), ...data },
          })
        );
        if (!updatedExisting) {
          await outboxService.enqueue('update_friend_expense', {
            friendId,
            expenseId,
            payload: data,
          });
        }
      }

      // 2. Update local cache
      const cached = (await cacheService.get<FriendExpenseFeedItem[]>(cacheKey)) || [];
      const existing = cached.find((item) => item.id === expenseId);
      const optimistic: any = {
        ...(existing || {
          id: expenseId,
          friend_id: friendId,
          user_id: '',
          created_at: new Date().toISOString(),
        }),
        ...data,
        edited_at: new Date().toISOString(),
        is_pending_sync: true,
      };

      const refreshed = cached.some((item) => item.id === expenseId)
        ? cached.map((item) => (item.id === expenseId ? optimistic : item))
        : [optimistic, ...cached];

      await cacheService.set(cacheKey, refreshed);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticUpdate();
    }

    try {
      const res: any = await apiClient.patch(
        `/api/v1/friends/${friendId}/expenses/${expenseId}`,
        data
      );
      const cached = await cacheService.get<FriendExpenseFeedItem[]>(cacheKey);
      if (Array.isArray(cached)) {
        const refreshed = cached.map((item) => (item.id === expenseId ? { ...item, ...res } : item));
        await cacheService.set(cacheKey, refreshed);
      }
      await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
      await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticUpdate();
      }
      throw err;
    }
  },

  deleteFriendExpense: async (
    friendId: string,
    expenseId: string
  ): Promise<void> => {
    const cacheKey = CACHE_KEYS.FRIEND_EXPENSES(friendId);

    const handleOptimisticDelete = async (): Promise<void> => {
      // 1. If this was a pending offline creation, simply remove it from outbox
      const removedCreations = await outboxService.removeMatching(
        (a) => a.tempId === expenseId || (a.type === 'create_friend_expense' && a.tempId === expenseId)
      );

      // Clean up any pending updates for this expenseId
      await outboxService.removeMatching(
        (a) =>
          a.type === 'update_friend_expense' &&
          a.payload?.friendId === friendId &&
          a.payload?.expenseId === expenseId
      );

      // If it wasn't a local creation, enqueue delete_friend_expense
      if (removedCreations === 0) {
        await outboxService.enqueue('delete_friend_expense', { friendId, expenseId });
      }

      // 2. Remove from local cache
      const cached = await cacheService.get<FriendExpenseFeedItem[]>(cacheKey);
      if (Array.isArray(cached)) {
        const filtered = cached.filter((item) => item.id !== expenseId);
        await cacheService.set(cacheKey, filtered);
      }
    };

    if (!networkService.isOnline()) {
      return handleOptimisticDelete();
    }

    try {
      await apiClient.delete(`/api/v1/friends/${friendId}/expenses/${expenseId}`);
      const cached = await cacheService.get<FriendExpenseFeedItem[]>(cacheKey);
      if (Array.isArray(cached)) {
        const filtered = cached.filter((item) => item.id !== expenseId);
        await cacheService.set(cacheKey, filtered);
      }
      await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
      await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticDelete();
      }
      throw err;
    }
  },

  recordFriendPayment: async (
    friendId: string,
    amount: number,
    payerId?: string
  ): Promise<any> => {
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const formattedDate = toLocalDateString(new Date());
    const cacheKey = CACHE_KEYS.FRIEND_EXPENSES(friendId);

    const handleOptimisticPayment = async (): Promise<any> => {
      const tempId = outboxService.generateTempId('temp-frd-pmt');
      const payload = {
        amount,
        category: 'payment',
        note: 'Settlement payment',
        expense_date: formattedDate,
        paid_by: payerId || undefined,
        split_type: 'full' as const,
      };

      await outboxService.enqueue('record_friend_payment', { friendId, payload }, tempId);

      const optimistic: any = {
        id: tempId,
        user_id: '',
        amount,
        category: 'payment',
        note: 'Settlement payment',
        expense_date: formattedDate,
        paid_by: payerId || '',
        created_at: new Date().toISOString(),
        edited_at: null,
        expense_splits: [],
        is_pending_sync: true,
      };

      const cached = (await cacheService.get<FriendExpenseFeedItem[]>(cacheKey)) || [];
      await cacheService.set(cacheKey, [optimistic, ...cached]);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticPayment();
    }

    try {
      const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, {
        amount,
        category: 'payment',
        note: 'Settlement payment',
        expense_date: formattedDate,
        paid_by: payerId || undefined,
        split_type: 'full',
      });

      const cached = await cacheService.get<FriendExpenseFeedItem[]>(cacheKey);
      if (Array.isArray(cached) && res) {
        await cacheService.set(cacheKey, [res, ...cached]);
      }
      await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
      await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticPayment();
      }
      throw err;
    }
  },
};
