import { appStorage } from './storage';
import { cacheService, CACHE_KEYS } from './cacheService';
import { networkService } from './networkService';
import { apiClient } from '../../api/client';
import { OutboxAction, OutboxActionType, SyncResult, PersonalExpense } from '../../types';

const OUTBOX_STORAGE_KEY = 'tabsy_outbox_queue';

type OutboxListener = (queue: OutboxAction[], isSyncing: boolean) => void;

class OutboxService {
  private queue: OutboxAction[] = [];
  private isSyncing: boolean = false;
  private isLoaded: boolean = false;
  private listeners: Set<OutboxListener> = new Set();

  constructor() {
    this.loadFromStorage();
    // Automatically trigger queue processing when network connectivity is restored
    networkService.subscribe((isOnline) => {
      if (isOnline) {
        this.processQueue().catch(() => {});
      }
    });
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = await appStorage.getItem<OutboxAction[]>(OUTBOX_STORAGE_KEY);
      this.queue = Array.isArray(saved) ? saved : [];
      this.isLoaded = true;
      this.notifyListeners();
    } catch {
      this.queue = [];
      this.isLoaded = true;
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await appStorage.setItem(OUTBOX_STORAGE_KEY, this.queue);
    } catch (err) {
      console.warn('[outboxService] Failed to save outbox to storage:', err);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.queue], this.isSyncing);
      } catch (err) {
        console.warn('[outboxService] Listener error:', err);
      }
    });
  }

  public subscribe(listener: OutboxListener): () => void {
    this.listeners.add(listener);
    listener([...this.queue], this.isSyncing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getQueue(): OutboxAction[] {
    return [...this.queue];
  }

  public generateTempId(prefix = 'temp-exp'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Enqueues an action to be dispatched when online.
   * Returns the generated temporary ID.
   */
  public async enqueue<T = any>(
    type: OutboxActionType,
    payload: T,
    tempId?: string
  ): Promise<string> {
    if (!this.isLoaded) {
      await this.loadFromStorage();
    }

    const assignedTempId = tempId || this.generateTempId();
    const action: OutboxAction<T> = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      tempId: assignedTempId,
    };

    this.queue.push(action);
    await this.saveToStorage();
    this.notifyListeners();

    // If online right now, attempt immediate dispatch in background
    if (networkService.isOnline()) {
      this.processQueue().catch(() => {});
    }

    return assignedTempId;
  }

  /**
   * Removes a specific action from the queue.
   */
  public async remove(actionId: string): Promise<void> {
    this.queue = this.queue.filter((a) => a.id !== actionId);
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Removes actions from the queue matching the given predicate.
   * Returns the count of removed items.
   */
  public async removeMatching(predicate: (action: OutboxAction) => boolean): Promise<number> {
    if (!this.isLoaded) {
      await this.loadFromStorage();
    }
    const initialLen = this.queue.length;
    this.queue = this.queue.filter((a) => !predicate(a));
    const removedCount = initialLen - this.queue.length;
    if (removedCount > 0) {
      await this.saveToStorage();
      this.notifyListeners();
    }
    return removedCount;
  }

  /**
   * Updates the payload of the first queued action matching predicate.
   * Useful to merge offline edits into pending creations before dispatch.
   */
  public async updatePendingPayload<T = any>(
    predicate: (action: OutboxAction) => boolean,
    updater: Partial<T> | ((currentPayload: T) => T)
  ): Promise<boolean> {
    if (!this.isLoaded) {
      await this.loadFromStorage();
    }
    let found = false;
    this.queue = this.queue.map((action) => {
      if (!found && predicate(action)) {
        found = true;
        const newPayload =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(action.payload)
            : { ...(action.payload || {}), ...updater };
        return {
          ...action,
          payload: newPayload,
        };
      }
      return action;
    });
    if (found) {
      await this.saveToStorage();
      this.notifyListeners();
    }
    return found;
  }

  /**
   * Clears the entire queue.
   */
  public async clear(): Promise<void> {
    this.queue = [];
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Replays all queued actions in FIFO order against the backend.
   */
  public async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }
    if (!this.isLoaded) {
      await this.loadFromStorage();
    }
    if (this.queue.length === 0) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }
    if (!networkService.isOnline()) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let syncedCount = 0;
    let failedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    try {
      const actions = [...this.queue];

      for (const action of actions) {
        // Stop if disconnected while syncing
        if (!networkService.isOnline()) {
          break;
        }

        try {
          const result = await this.dispatchAction(action);

          // On successful creation, reconcile optimistic local cache
          await this.reconcileOptimisticCache(action, result);

          // Remove from queue
          this.queue = this.queue.filter((a) => a.id !== action.id);
          await this.saveToStorage();
          syncedCount++;
        } catch (err: any) {
          const errorMsg = err.message || 'Sync failed';
          action.retryCount += 1;
          action.lastError = errorMsg;
          errors.push({ id: action.id, error: errorMsg });

          const isNetworkError =
            errorMsg === 'Network Error' ||
            errorMsg === 'Network connection failed' ||
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('timeout') ||
            errorMsg.toLowerCase().includes('econnrefused');

          // If genuine network-level error, pause replay until next reconnect
          if (isNetworkError) {
            await this.saveToStorage();
            break;
          }

          // If server rejected the request with 4xx or invalid data after 3 retries, drop to avoid blocking
          if (action.retryCount >= 3) {
            failedCount++;
            this.queue = this.queue.filter((a) => a.id !== action.id);
            await this.saveToStorage();
          } else {
            await this.saveToStorage();
          }
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Helper to ensure date is in YYYY-MM-DD ISO format as required by the backend schemas.
   */
  private sanitizeIsoDate(dateVal?: any): string {
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      return dateVal.split('T')[0];
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return dateVal.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Dispatches a single outbox action to its respective API route.
   */
  private async dispatchAction(action: OutboxAction): Promise<any> {
    switch (action.type) {
      case 'create_personal_expense': {
        const payload = action.payload;
        const backendPayload: any = {
          amount: Math.round(Number(payload.amount) * 100) / 100,
          category: String(payload.category || 'other').trim(),
          note: (payload.note || payload.description) ? String(payload.note || payload.description).trim() : null,
          expense_date: this.sanitizeIsoDate(payload.expense_date || payload.date),
        };
        const res: any = await apiClient.post('/api/v1/expenses/personal', backendPayload);
        return res;
      }
      case 'update_personal_expense': {
        const { expenseId, payload } = action.payload;
        const backendPayload: any = {};
        if (payload.amount !== undefined) backendPayload.amount = Math.round(Number(payload.amount) * 100) / 100;
        if (payload.category !== undefined) backendPayload.category = String(payload.category).trim();
        if (payload.note !== undefined || payload.description !== undefined) {
          backendPayload.note = (payload.note || payload.description) ? String(payload.note || payload.description).trim() : null;
        }
        if (payload.expense_date || payload.date) {
          backendPayload.expense_date = this.sanitizeIsoDate(payload.expense_date || payload.date);
        }
        const res: any = await apiClient.patch(`/api/v1/expenses/${expenseId}`, backendPayload);
        return res;
      }
      case 'delete_personal_expense': {
        const { expenseId } = action.payload;
        await apiClient.delete(`/api/v1/expenses/${expenseId}`);
        return { deleted: true, expenseId };
      }
      case 'create_friend_expense': {
        const { friendId, payload } = action.payload;
        const backendPayload: any = {
          amount: Math.round(Number(payload.amount) * 100) / 100,
          category: String(payload.category || 'food').trim(),
          note: (payload.note || payload.description) ? String(payload.note || payload.description).trim() : null,
          expense_date: this.sanitizeIsoDate(payload.expense_date || payload.date),
        };
        if (payload.paid_by) backendPayload.paid_by = payload.paid_by;
        if (payload.split_type) backendPayload.split_type = payload.split_type;
        const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, backendPayload);
        return res;
      }
      case 'update_friend_expense': {
        const { friendId, expenseId, payload } = action.payload;
        const backendPayload: any = {};
        if (payload.amount !== undefined) backendPayload.amount = Math.round(Number(payload.amount) * 100) / 100;
        if (payload.category !== undefined) backendPayload.category = String(payload.category).trim();
        if (payload.note !== undefined || payload.description !== undefined) {
          backendPayload.note = (payload.note || payload.description) ? String(payload.note || payload.description).trim() : null;
        }
        if (payload.expense_date || payload.date) {
          backendPayload.expense_date = this.sanitizeIsoDate(payload.expense_date || payload.date);
        }
        if (payload.paid_by !== undefined) backendPayload.paid_by = payload.paid_by;
        if (payload.split_type !== undefined) backendPayload.split_type = payload.split_type;
        const res: any = await apiClient.patch(`/api/v1/friends/${friendId}/expenses/${expenseId}`, backendPayload);
        return res;
      }
      case 'delete_friend_expense': {
        const { friendId, expenseId } = action.payload;
        await apiClient.delete(`/api/v1/friends/${friendId}/expenses/${expenseId}`);
        return { deleted: true, friendId, expenseId };
      }
      case 'record_friend_payment': {
        const { friendId, payload } = action.payload;
        const backendPayload: any = {
          amount: Math.round(Number(payload.amount) * 100) / 100,
          category: 'payment',
          note: payload.note || 'Settlement payment',
          expense_date: this.sanitizeIsoDate(payload.expense_date || payload.date),
          split_type: 'full',
        };
        if (payload.paid_by) backendPayload.paid_by = payload.paid_by;
        const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, backendPayload);
        return res;
      }
      case 'create_group_expense': {
        const { groupId, payload } = action.payload;
        const backendPayload: any = {
          amount: Math.round(Number(payload.amount) * 100) / 100,
          category: String(payload.category || 'other').trim(),
          note: (payload.note || payload.description) ? String(payload.note || payload.description).trim() : null,
          expense_date: this.sanitizeIsoDate(payload.expense_date || payload.date),
        };
        if (payload.paid_by) backendPayload.paid_by = payload.paid_by;
        if (payload.status) backendPayload.status = payload.status;
        if (payload.receipt_url) backendPayload.receipt_url = payload.receipt_url;
        if (Array.isArray(payload.splits)) backendPayload.splits = payload.splits;
        const res: any = await apiClient.post(`/api/v1/groups/${groupId}/expenses`, backendPayload);
        return res;
      }
      case 'update_group_expense': {
        const { groupId, expenseId, payload } = action.payload;
        const backendPayload: any = {};
        if (payload.amount !== undefined) backendPayload.amount = Math.round(Number(payload.amount) * 100) / 100;
        if (payload.category !== undefined) backendPayload.category = String(payload.category).trim();
        if (payload.note !== undefined || payload.description !== undefined) {
          backendPayload.note = (payload.note || payload.description) ? String(payload.note || payload.description).trim() : null;
        }
        if (payload.expense_date || payload.date) {
          backendPayload.expense_date = this.sanitizeIsoDate(payload.expense_date || payload.date);
        }
        if (payload.paid_by !== undefined) backendPayload.paid_by = payload.paid_by;
        if (payload.status !== undefined) backendPayload.status = payload.status;
        if (payload.receipt_url !== undefined) backendPayload.receipt_url = payload.receipt_url;
        if (Array.isArray(payload.splits)) backendPayload.splits = payload.splits;
        const res: any = await apiClient.patch(`/api/v1/groups/${groupId}/expenses/${expenseId}`, backendPayload);
        return res;
      }
      case 'delete_group_expense': {
        const { groupId, expenseId } = action.payload;
        await apiClient.delete(`/api/v1/groups/${groupId}/expenses/${expenseId}`);
        return { deleted: true, groupId, expenseId };
      }
      case 'create_category': {
        const { payload } = action.payload;
        const res: any = await apiClient.post('/api/v1/categories/', payload);
        return res;
      }
      case 'update_category': {
        const { categoryId, payload } = action.payload;
        const res: any = await apiClient.patch(`/api/v1/categories/${categoryId}`, payload);
        return res;
      }
      case 'delete_category': {
        const { categoryId } = action.payload;
        await apiClient.delete(`/api/v1/categories/${categoryId}`);
        return { deleted: true, categoryId };
      }
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Reconciles optimistic local cache with the permanent server response.
   */
  private async reconcileOptimisticCache(action: OutboxAction, serverResult: any): Promise<void> {
    try {
      if (action.type === 'create_personal_expense' && action.tempId && serverResult?.id) {
        const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
        if (Array.isArray(cached)) {
          const updated = cached.map((item) => {
            if (item.id === action.tempId) {
              return {
                ...item,
                id: serverResult.id,
                is_pending_sync: false,
                sync_error: null,
              };
            }
            return item;
          });
          await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, updated);
        }
        await cacheService.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);
        await cacheService.invalidate(CACHE_KEYS.INSIGHT_DASHBOARD_DATA);
        await cacheService.invalidate(CACHE_KEYS.STREAK_DATES);
      } else if (action.type === 'update_personal_expense') {
        const expenseId = action.payload?.expenseId;
        const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
        if (Array.isArray(cached) && expenseId) {
          const updated = cached.map((item) => {
            if (item.id === expenseId) {
              return {
                ...item,
                ...(serverResult || {}),
                is_pending_sync: false,
                sync_error: null,
              };
            }
            return item;
          });
          await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, updated);
        }
        await cacheService.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);
        await cacheService.invalidate(CACHE_KEYS.INSIGHT_DASHBOARD_DATA);
        await cacheService.invalidate(CACHE_KEYS.STREAK_DATES);
      } else if (action.type === 'delete_personal_expense') {
        const expenseId = action.payload?.expenseId;
        const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
        if (Array.isArray(cached) && expenseId) {
          const filtered = cached.filter((item) => item.id !== expenseId);
          await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, filtered);
        }
        await cacheService.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);
        await cacheService.invalidate(CACHE_KEYS.INSIGHT_DASHBOARD_DATA);
        await cacheService.invalidate(CACHE_KEYS.STREAK_DATES);
      } else if (
        action.type === 'create_group_expense' ||
        action.type === 'update_group_expense' ||
        action.type === 'delete_group_expense'
      ) {
        const groupId = action.payload?.groupId;
        if (groupId) {
          if (action.type === 'create_group_expense' && action.tempId && serverResult?.id) {
            const cachedExpenses = await cacheService.get<any[]>(CACHE_KEYS.GROUP_EXPENSES(groupId));
            if (Array.isArray(cachedExpenses)) {
              const updated = cachedExpenses.map((item) =>
                item.id === action.tempId ? { ...item, ...serverResult, id: serverResult.id, is_pending_sync: false } : item
              );
              await cacheService.set(CACHE_KEYS.GROUP_EXPENSES(groupId), updated);
            }
          }
          await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
          await cacheService.invalidate(CACHE_KEYS.GROUP_EXPENSES(groupId));
          await cacheService.invalidate(`cache:group_balances:${groupId}`);
          await cacheService.invalidatePattern(`cache:monthly_ledger:${groupId}`);
        }
        await cacheService.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);
        await cacheService.invalidate(CACHE_KEYS.INSIGHT_DASHBOARD_DATA);
      } else if (
        action.type === 'create_friend_expense' ||
        action.type === 'update_friend_expense' ||
        action.type === 'delete_friend_expense' ||
        action.type === 'record_friend_payment'
      ) {
        const friendId = action.payload?.friendId;
        await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
        await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
        if (friendId) {
          if (
            (action.type === 'create_friend_expense' || action.type === 'record_friend_payment') &&
            action.tempId &&
            serverResult?.id
          ) {
            const cachedExpenses = await cacheService.get<any[]>(CACHE_KEYS.FRIEND_EXPENSES(friendId));
            if (Array.isArray(cachedExpenses)) {
              const updated = cachedExpenses.map((item) =>
                item.id === action.tempId ? { ...item, ...serverResult, id: serverResult.id, is_pending_sync: false } : item
              );
              await cacheService.set(CACHE_KEYS.FRIEND_EXPENSES(friendId), updated);
            }
          }
          await cacheService.invalidate(CACHE_KEYS.FRIEND_EXPENSES(friendId));
        }
        await cacheService.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);
        await cacheService.invalidate(CACHE_KEYS.INSIGHT_DASHBOARD_DATA);
      } else if (
        action.type === 'create_category' ||
        action.type === 'update_category' ||
        action.type === 'delete_category'
      ) {
        if (action.type === 'create_category' && action.tempId && serverResult?.id) {
          const cachedCats = await cacheService.get<any[]>(CACHE_KEYS.CATEGORIES);
          if (Array.isArray(cachedCats)) {
            const updated = cachedCats.map((c) =>
              c.id === action.tempId ? { ...c, ...serverResult, id: serverResult.id, is_pending_sync: false } : c
            );
            await cacheService.set(CACHE_KEYS.CATEGORIES, updated);
          }
        }
        await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
      }
    } catch (err) {
      console.warn('[outboxService] Error reconciling cache:', err);
    }
  }
}

export const outboxService = new OutboxService();
