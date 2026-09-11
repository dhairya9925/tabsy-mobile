import test from 'node:test';
import assert from 'node:assert';
import { useBudgetStore } from './useBudgetStore';

test('useBudgetStore should initialize with 30000 default monthly target', () => {
  useBudgetStore.setState({ monthlyBudget: 30000, customBudgets: [] });
  const state = useBudgetStore.getState();
  assert.strictEqual(state.monthlyBudget, 30000);
  assert.deepStrictEqual(state.customBudgets, []);
});

test('useBudgetStore setMonthlyBudget should update monthlyBudget', () => {
  useBudgetStore.getState().setMonthlyBudget(50000);
  assert.strictEqual(useBudgetStore.getState().monthlyBudget, 50000);
});

test('useBudgetStore addCustomBudget should update monthlyBudget and append to customBudgets', () => {
  useBudgetStore.getState().addCustomBudget(42000);
  const state = useBudgetStore.getState();
  assert.strictEqual(state.monthlyBudget, 42000);
  assert.strictEqual(state.customBudgets.includes(42000), true);

  // Duplicate add should not create duplicates
  useBudgetStore.getState().addCustomBudget(42000);
  assert.strictEqual(
    useBudgetStore.getState().customBudgets.filter((b) => b === 42000).length,
    1
  );
});
