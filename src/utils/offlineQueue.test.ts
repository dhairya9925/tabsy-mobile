import test from 'node:test';
import assert from 'node:assert';
import { offlineQueue } from './offlineQueue';
import { expensesApi } from '../api/expenses';

test('offlineQueue adds, retrieves, counts, and removes items', async () => {
  await offlineQueue.clearQueue();
  assert.strictEqual(await offlineQueue.getCount(), 0);

  // Add 1 personal expense
  const item1 = await offlineQueue.queueExpense({
    expense_type: 'personal',
    amount: 250,
    category: 'Food',
    note: 'Lunch at cafe',
    expense_date: '2026-10-02',
  });

  assert.strictEqual(typeof item1.id, 'string');
  assert.strictEqual(item1.amount, 250);
  assert.strictEqual(await offlineQueue.getCount(), 1);

  // Add 2nd expense
  const item2 = await offlineQueue.queueExpense({
    expense_type: 'personal',
    amount: 100,
    category: 'Transport',
    note: 'Auto ride',
    expense_date: '2026-10-02',
  });

  assert.strictEqual(await offlineQueue.getCount(), 2);

  const queue = await offlineQueue.getQueue();
  assert.strictEqual(queue.length, 2);
  assert.strictEqual(queue[0].id, item1.id);
  assert.strictEqual(queue[1].id, item2.id);

  // Remove first item
  await offlineQueue.removeExpense(item1.id);
  assert.strictEqual(await offlineQueue.getCount(), 1);

  const queueAfterRemove = await offlineQueue.getQueue();
  assert.strictEqual(queueAfterRemove[0].id, item2.id);

  // Clear queue
  await offlineQueue.clearQueue();
  assert.strictEqual(await offlineQueue.getCount(), 0);
});

test('offlineQueue.processQueue successfully dispatches pending personal expenses', async () => {
  await offlineQueue.clearQueue();

  // Queue an expense
  await offlineQueue.queueExpense({
    expense_type: 'personal',
    amount: 150,
    category: 'Groceries',
    note: 'Milk and bread',
    expense_date: '2026-10-02',
  });

  assert.strictEqual(await offlineQueue.getCount(), 1);

  // Mock createPersonalExpense
  const originalCreate = expensesApi.createPersonalExpense;
  let createdPayload: any = null;
  expensesApi.createPersonalExpense = async (payload: any) => {
    createdPayload = payload;
    return {
      id: 'mock_expense_1',
      ...payload,
      created_at: new Date().toISOString(),
    } as any;
  };

  try {
    const invalidatedKeys: any[] = [];
    const mockQueryClient = {
      invalidateQueries: (obj: any) => {
        invalidatedKeys.push(obj.queryKey);
      },
    };

    const res = await offlineQueue.processQueue(mockQueryClient);
    assert.strictEqual(res.succeeded, 1);
    assert.strictEqual(res.failed, 0);
    assert.strictEqual(createdPayload?.amount, 150);
    assert.strictEqual(createdPayload?.category, 'Groceries');
    assert.strictEqual(await offlineQueue.getCount(), 0);
    assert.strictEqual(invalidatedKeys.length > 0, true);
  } finally {
    expensesApi.createPersonalExpense = originalCreate;
    await offlineQueue.clearQueue();
  }
});

test('offlineQueue.processQueue retains items when API call fails', async () => {
  await offlineQueue.clearQueue();

  await offlineQueue.queueExpense({
    expense_type: 'personal',
    amount: 300,
    category: 'Shopping',
    note: 'Book',
  });

  // Mock failure
  const originalCreate = expensesApi.createPersonalExpense;
  expensesApi.createPersonalExpense = async () => {
    throw new Error('Network Error: Offline');
  };

  try {
    const res = await offlineQueue.processQueue();
    assert.strictEqual(res.succeeded, 0);
    assert.strictEqual(res.failed, 1);
    assert.strictEqual(await offlineQueue.getCount(), 1);
  } finally {
    expensesApi.createPersonalExpense = originalCreate;
    await offlineQueue.clearQueue();
  }
});
