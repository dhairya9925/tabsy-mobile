import { create } from 'zustand';

export interface BudgetState {
  monthlyBudget: number;
  customBudgets: number[];
  setMonthlyBudget: (amount: number) => void;
  addCustomBudget: (amount: number) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  monthlyBudget: 30000, // Default Sprout monthly target ₹30,000
  customBudgets: [],
  setMonthlyBudget: (amount: number) => set({ monthlyBudget: amount }),
  addCustomBudget: (amount: number) =>
    set((state) => ({
      monthlyBudget: amount,
      customBudgets: state.customBudgets.includes(amount)
        ? state.customBudgets
        : [...state.customBudgets, amount],
    })),
}));
