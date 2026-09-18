import { create } from 'zustand';
import { appStorage } from '../services/offline/storage';

const BUDGET_STORAGE_KEY = 'tabsy_user_budget_pref';

export interface BudgetState {
  monthlyBudget: number;
  customBudgets: number[];
  setMonthlyBudget: (amount: number) => void;
  addCustomBudget: (amount: number) => void;
  initBudgetPreferences: () => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  monthlyBudget: 30000, // Default Sprout monthly target ₹30,000
  customBudgets: [],

  initBudgetPreferences: async () => {
    try {
      const saved = await appStorage.getItem<{ monthlyBudget: number; customBudgets: number[] }>(
        BUDGET_STORAGE_KEY
      );
      if (saved) {
        set({
          monthlyBudget: saved.monthlyBudget || 30000,
          customBudgets: Array.isArray(saved.customBudgets) ? saved.customBudgets : [],
        });
      }
    } catch (err) {
      console.warn('[useBudgetStore] Error loading budget pref:', err);
    }
  },

  setMonthlyBudget: (amount: number) => {
    set({ monthlyBudget: amount });
    appStorage
      .setItem(BUDGET_STORAGE_KEY, {
        monthlyBudget: amount,
        customBudgets: get().customBudgets,
      })
      .catch(() => {});
  },

  addCustomBudget: (amount: number) => {
    set((state) => {
      const newCustom = state.customBudgets.includes(amount)
        ? state.customBudgets
        : [...state.customBudgets, amount];
      appStorage
        .setItem(BUDGET_STORAGE_KEY, {
          monthlyBudget: amount,
          customBudgets: newCustom,
        })
        .catch(() => {});
      return {
        monthlyBudget: amount,
        customBudgets: newCustom,
      };
    });
  },
}));

// Automatically hydrate preferences on boot
useBudgetStore.getState().initBudgetPreferences().catch(() => {});

