import { secureStorage } from './secureStorage';
import { expensesApi } from '../api/expenses';
import { groupsApi } from '../api/groups';
import { friendsApi } from '../api/friends';
import { splitEqual } from './money';

export const OFFLINE_QUEUE_STORAGE_KEY = 'tabsy_offline_pending_expenses';

export interface QueuedExpense {
  id: string;
  timestamp: number;
  expense_type: 'personal' | 'group' | 'friend';
  amount: number;
  category: string;
  note?: string;
  expense_date?: string;
  group_id?: string;
  friend_id?: string;
  paid_by?: string;
  split_type?: 'equal' | 'full' | 'custom';
}

export const offlineQueue = {
  async getQueue(): Promise<QueuedExpense[]> {
    try {
      const raw = await secureStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async queueExpense(expense: Omit<QueuedExpense, 'id' | 'timestamp'>): Promise<QueuedExpense> {
    const queue = await this.getQueue();
    const item: QueuedExpense = {
      ...expense,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    queue.push(item);
    await secureStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return item;
  },

  async removeExpense(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await secureStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  },

  async clearQueue(): Promise<void> {
    await secureStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify([]));
  },

  async getCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  },

  async processQueue(queryClient?: any): Promise<{ succeeded: number; failed: number }> {
    const queue = await this.getQueue();
    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed = 0;
    const remaining: QueuedExpense[] = [];

    for (const item of queue) {
      try {
        const expenseDate = item.expense_date || new Date().toISOString().split('T')[0];

        if (item.expense_type === 'personal') {
          await expensesApi.createPersonalExpense({
            amount: item.amount,
            category: item.category,
            note: item.note,
            expense_date: expenseDate,
          });
          succeeded++;
        } else if (item.expense_type === 'group' && item.group_id) {
          const members = await groupsApi.getGroupMembers(item.group_id);
          const count = members.length > 0 ? members.length : 1;
          const shares = splitEqual(item.amount, count);
          const splits = members.map((m, idx) => ({
            user_id: m.user_id,
            amount: shares[idx] || 0,
          }));

          await groupsApi.createGroupExpense(item.group_id, {
            amount: item.amount,
            category: item.category,
            note: item.note,
            expense_date: expenseDate,
            splits,
          });
          succeeded++;
        } else if (item.expense_type === 'friend' && item.friend_id) {
          await friendsApi.createFriendExpense(item.friend_id, {
            amount: item.amount,
            category: item.category,
            note: item.note,
            expense_date: expenseDate,
            paid_by: item.paid_by || 'self',
            split_type: item.split_type === 'full' ? 'full' : 'equal',
          });
          succeeded++;
        } else {
          // Unsupported type or missing target ID
          failed++;
          remaining.push(item);
        }
      } catch (err) {
        failed++;
        remaining.push(item);
      }
    }


    await secureStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(remaining));

    if (succeeded > 0 && queryClient) {
      try {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['streak'] });
      } catch {
        // Non-blocking
      }
    }

    return { succeeded, failed };
  },
};
