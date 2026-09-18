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

          // If network-level error, pause replay until next reconnect
          if (err.message === 'Network Error' || !err.response) {
            await this.saveToStorage();
            break;
          }

          // If server validation error (4xx) and retried 3 times, fail action
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
   * Dispatches a single outbox action to its respective API route.
   */
  private async dispatchAction(action: OutboxAction): Promise<any> {
    switch (action.type) {
      case 'create_personal_expense': {
        const payload = action.payload;
        const backendPayload = {
          amount: payload.amount,
          category: payload.category,
          note: payload.note || payload.description || null,
          expense_date: payload.expense_date || payload.date,
        };
        const res: any = await apiClient.post('/api/v1/expenses/personal', backendPayload);
        return res;
      }
      case 'create_friend_expense': {
        const { friendId, payload } = action.payload;
        const res: any = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, payload);
        return res;
      }
      case 'create_group_expense': {
        const { groupId, payload } = action.payload;
        const res: any = await apiClient.post(`/api/v1/groups/${groupId}/expenses`, payload);
        return res;
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
      } else if (action.type === 'create_group_expense') {
        // Invalidate group cache to fetch clean calculated splits
        const groupId = action.payload?.groupId;
        if (groupId) {
          await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
          await cacheService.invalidatePattern(`cache:monthly_ledger:${groupId}`);
        }
      } else if (action.type === 'create_friend_expense') {
        await cacheService.invalidate(CACHE_KEYS.FRIENDS_LIST);
        await cacheService.invalidate(CACHE_KEYS.FRIEND_BALANCES);
      }
    } catch (err) {
      console.warn('[outboxService] Error reconciling cache:', err);
    }
  }
}

export const outboxService = new OutboxService();
