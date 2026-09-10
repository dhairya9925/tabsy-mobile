import { create } from 'zustand';

interface BudgetState {
  monthlyBudget: number;
  setMonthlyBudget: (amount: number) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  monthlyBudget: 30000, // Default Sprout monthly target ₹30,000
  setMonthlyBudget: (amount: number) => set({ monthlyBudget: amount }),
}));
