import { apiClient } from './client';
import { Category, DashboardSummary, PersonalExpense, PersonalExpenseCreate, PersonalExpenseUpdate } from '../types';

export const expensesApi = {
  async getPersonalExpenses(params?: {
    category?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PersonalExpense[]> {
    const raw: any = await apiClient.get('/api/v1/expenses/personal', { params });
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      ...item,
      description: item.note || item.description || item.category,
      date: item.expense_date || item.date,
    }));
  },

  async createPersonalExpense(payload: PersonalExpenseCreate): Promise<PersonalExpense> {
    const backendPayload = {
      amount: payload.amount,
      category: payload.category,
      note: payload.note || payload.description || null,
      expense_date: payload.expense_date || payload.date,
    };
    const res: any = await apiClient.post('/api/v1/expenses/personal', backendPayload);
    return {
      ...res,
      description: res.note || res.description || res.category,
      date: res.expense_date || res.date,
    };
  },

  async updatePersonalExpense(
    expenseId: string,
    payload: PersonalExpenseUpdate
  ): Promise<PersonalExpense> {
    const res: any = await apiClient.patch(`/api/v1/expenses/${expenseId}`, payload);
    return {
      ...res,
      description: res.note || res.description || res.category,
      date: res.expense_date || res.date,
    };
  },

  async deletePersonalExpense(expenseId: string): Promise<void> {
    await apiClient.delete(`/api/v1/expenses/${expenseId}`);
  },

  async getCategories(): Promise<Category[]> {
    const res: any = await apiClient.get('/api/v1/categories/');
    return Array.isArray(res) ? res : [];
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const res: any = await apiClient.get('/api/v1/dashboard/summary');
    return res || {};
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
