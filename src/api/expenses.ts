import { apiClient } from './client';
import {
  Category,
  DashboardSummary,
  PersonalExpense,
  PersonalExpenseCreate,
  PersonalExpenseUpdate,
} from '../types';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { outboxService } from '../services/offline/outboxService';
import { networkService } from '../services/offline/networkService';

export const expensesApi = {
  async getPersonalExpenses(params?: {
    category?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PersonalExpense[]> {
    const isUnfiltered = !params || Object.keys(params).length === 0;

    // Fast-path: If offline and unfiltered, immediately return cached expenses
    if (isUnfiltered && !networkService.isOnline()) {
      const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
      if (Array.isArray(cached)) return cached;
    }

    try {
      const raw: any = await apiClient.get('/api/v1/expenses/personal', { params });
      if (!Array.isArray(raw)) return [];
      const freshExpenses: PersonalExpense[] = raw.map((item: any) => ({
        ...item,
        description: item.note || item.description || item.category,
        date: item.expense_date || item.date,
        is_pending_sync: false,
      }));

      // If unfiltered, reconcile with any pending outbox items and cache
      if (isUnfiltered) {
        const outbox = outboxService.getQueue().filter((a) => a.type === 'create_personal_expense');
        const pendingItems: PersonalExpense[] = outbox.map((action) => {
          const p = action.payload;
          const expDate = p.expense_date || p.date || new Date().toISOString().split('T')[0];
          return {
            id: action.tempId || action.id,
            user_id: '',
            amount: p.amount,
            category: p.category,
            note: p.note || p.description || null,
            description: p.note || p.description || p.category,
            expense_date: expDate,
            date: expDate,
            created_at: new Date(action.createdAt).toISOString(),
            updated_at: new Date(action.createdAt).toISOString(),
            is_pending_sync: true,
          };
        });

        // Prepend any pending items that aren't on the server yet
        const merged = [...pendingItems, ...freshExpenses];
        await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, merged);
        return merged;
      }

      return freshExpenses;
    } catch (err) {
      // If network failed, fall back to local cache
      if (isUnfiltered) {
        const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
        if (Array.isArray(cached) && cached.length > 0) {
          return cached;
        }
      }
      throw err;
    }
  },

  async createPersonalExpense(payload: PersonalExpenseCreate): Promise<PersonalExpense> {
    const expDate = payload.expense_date || payload.date || new Date().toISOString().split('T')[0];

    // If offline, create optimistically and queue in outbox
    if (!networkService.isOnline()) {
      const tempId = outboxService.generateTempId('temp-exp');
      const optimistic: PersonalExpense = {
        id: tempId,
        user_id: '',
        amount: payload.amount,
        category: payload.category,
        note: payload.note || payload.description || null,
        description: payload.note || payload.description || payload.category,
        expense_date: expDate,
        date: expDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_pending_sync: true,
      };

      // Prepend to cached expenses
      const cached = (await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES)) || [];
      await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [optimistic, ...cached]);

      // Enqueue to persistent outbox
      await outboxService.enqueue('create_personal_expense', payload, tempId);

      return optimistic;
    }

    try {
      const backendPayload = {
        amount: payload.amount,
        category: payload.category,
        note: payload.note || payload.description || null,
        expense_date: expDate,
      };
      const res: any = await apiClient.post('/api/v1/expenses/personal', backendPayload);
      const created: PersonalExpense = {
        ...res,
        description: res.note || res.description || res.category,
        date: res.expense_date || res.date,
        is_pending_sync: false,
      };

      // Prepend to cached list
      const cached = (await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES)) || [];
      await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [created, ...cached]);

      return created;
    } catch (err: any) {
      // If network error occurred during creation, save to outbox gracefully
      if (err.message === 'Network Error' || !err.response) {
        const tempId = outboxService.generateTempId('temp-exp');
        const optimistic: PersonalExpense = {
          id: tempId,
          user_id: '',
          amount: payload.amount,
          category: payload.category,
          note: payload.note || payload.description || null,
          description: payload.note || payload.description || payload.category,
          expense_date: expDate,
          date: expDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_pending_sync: true,
        };

        const cached = (await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES)) || [];
        await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [optimistic, ...cached]);
        await outboxService.enqueue('create_personal_expense', payload, tempId);

        return optimistic;
      }
      throw err;
    }
  },

  async updatePersonalExpense(
    expenseId: string,
    payload: PersonalExpenseUpdate
  ): Promise<PersonalExpense> {
    const res: any = await apiClient.patch(`/api/v1/expenses/${expenseId}`, payload);
    const updated: PersonalExpense = {
      ...res,
      description: res.note || res.description || res.category,
      date: res.expense_date || res.date,
    };

    // Update local cache
    const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
    if (Array.isArray(cached)) {
      const refreshed = cached.map((e) => (e.id === expenseId ? updated : e));
      await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, refreshed);
    }

    return updated;
  },

  async deletePersonalExpense(expenseId: string): Promise<void> {
    await apiClient.delete(`/api/v1/expenses/${expenseId}`);
    const cached = await cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES);
    if (Array.isArray(cached)) {
      const filtered = cached.filter((e) => e.id !== expenseId);
      await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, filtered);
    }
  },

  async getCategories(): Promise<Category[]> {
    if (!networkService.isOnline()) {
      const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }

    try {
      const res: any = await apiClient.get('/api/v1/categories/');
      const categories = Array.isArray(res) ? res : [];
      if (categories.length > 0) {
        await cacheService.set(CACHE_KEYS.CATEGORIES, categories);
      }
      return categories;
    } catch (err) {
      const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      return [];
    }
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    if (!networkService.isOnline()) {
      const cached = await cacheService.get<DashboardSummary>(CACHE_KEYS.DASHBOARD_SUMMARY);
      if (cached) return cached;
    }

    try {
      const res: any = await apiClient.get('/api/v1/dashboard/summary');
      const summary = res || {};
      await cacheService.set(CACHE_KEYS.DASHBOARD_SUMMARY, summary);
      return summary;
    } catch (err) {
      const cached = await cacheService.get<DashboardSummary>(CACHE_KEYS.DASHBOARD_SUMMARY);
      return cached || ({} as DashboardSummary);
    }
  },

  async getFriendBalances(): Promise<any[]> {
    try {
      const res: any = await apiClient.get('/api/v1/friends/balances');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  /**
   * Fetches logged activity dates to compute user streaks across personal, friend, and group expenses.
   */
  async getStreakActivityDates(): Promise<string[]> {
    try {
      const dates = new Set<string>();
      
      // 1. Personal expenses
      const personalExpenses = await this.getPersonalExpenses();
      if (Array.isArray(personalExpenses)) {
        for (const exp of personalExpenses) {
          const d = exp.expense_date || exp.date;
          if (d) {
            dates.add(d.split('T')[0]);
          }
        }
      }

      // 2. Dashboard recent items if any
      const summary = await this.getDashboardSummary();
      if (summary && Array.isArray(summary.recent_expenses)) {
        for (const exp of summary.recent_expenses) {
          const d = exp.expense_date || exp.date;
          if (d) {
            dates.add(d.split('T')[0]);
          }
        }
      }

      return Array.from(dates);
    } catch {
      return [];
    }
  },
};
