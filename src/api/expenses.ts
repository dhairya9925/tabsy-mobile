import { apiClient } from './client';
import { Category, DashboardSummary, PersonalExpense, PersonalExpenseCreate } from '../types';

export const expensesApi = {
  async getPersonalExpenses(params?: {
    category?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PersonalExpense[]> {
    return apiClient.get('/api/v1/expenses/personal', { params });
  },

  async createPersonalExpense(payload: PersonalExpenseCreate): Promise<PersonalExpense> {
    return apiClient.post('/api/v1/expenses/personal', payload);
  },

  async getCategories(): Promise<Category[]> {
    return apiClient.get('/api/v1/categories/');
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    return apiClient.get('/api/v1/dashboard/summary');
  },

  async getFriendBalances(): Promise<any[]> {
    try {
      return await apiClient.get('/api/v1/friends/balances');
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
          if (exp.date) {
            dates.add(exp.date.split('T')[0]);
          }
        }
      }

      // 2. Dashboard recent items if any
      const summary = await this.getDashboardSummary();
      if (summary && Array.isArray(summary.recent_expenses)) {
        for (const exp of summary.recent_expenses) {
          if (exp.date) {
            dates.add(exp.date.split('T')[0]);
          }
        }
      }

      return Array.from(dates);
    } catch {
      return [];
    }
  },
};
