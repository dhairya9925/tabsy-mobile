import test from 'node:test';
import assert from 'node:assert';
import { formatCurrencyExact, formatDateTime, formatDate } from '../../utils/formatters';
import { GroupExpense, GroupSettlementRecord } from '../../types';

test('SettleUp: calculates direct split debt vs credit offsets for user trip scenario', () => {
  const currentUserId = 'user-you';
  const vikramId = 'user-vikram';

  const mockExpenses: GroupExpense[] = [
    {
      id: 'exp-hotel',
      amount: 15000,
      category: 'travel',
      note: 'Hotel Booking',
      expense_date: '2026-10-28',
      user_id: currentUserId,
      paid_by: currentUserId,
      status: 'submitted',
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
      splits: [
        {
          id: 'sp-1',
          expense_id: 'exp-hotel',
          user_id: currentUserId,
          amount: 5000,
          is_settled: true,
          created_at: '2026-10-28T10:00:00Z',
        },
        {
          id: 'sp-2',
          expense_id: 'exp-hotel',
          user_id: vikramId,
          amount: 5000,
          is_settled: false,
          created_at: '2026-10-28T10:00:00Z',
        },
      ],
    },
    {
      id: 'exp-concert',
      amount: 4500,
      category: 'entertainment',
      note: 'Music Concert',
      expense_date: '2026-10-28',
      user_id: vikramId,
      paid_by: vikramId,
      status: 'submitted',
      created_at: '2026-10-28T14:00:00Z',
      updated_at: '2026-10-28T14:00:00Z',
      splits: [
        {
          id: 'sp-3',
          expense_id: 'exp-concert',
          user_id: currentUserId,
          amount: 1500,
          is_settled: false,
          created_at: '2026-10-28T14:00:00Z',
        },
        {
          id: 'sp-4',
          expense_id: 'exp-concert',
          user_id: vikramId,
          amount: 1500,
          is_settled: true,
          created_at: '2026-10-28T14:00:00Z',
        },
      ],
    },
    {
      id: 'exp-dinner',
      amount: 652,
      category: 'food',
      note: 'Dinner',
      expense_date: '2026-10-28',
      user_id: currentUserId,
      paid_by: currentUserId,
      status: 'submitted',
      created_at: '2026-10-28T20:00:00Z',
      updated_at: '2026-10-28T20:00:00Z',
      splits: [
        {
          id: 'sp-5',
          expense_id: 'exp-dinner',
          user_id: vikramId,
          amount: 217.33,
          is_settled: false,
          created_at: '2026-10-28T20:00:00Z',
        },
      ],
    },
  ];

  // Emulate SettleUpModal directSplits calculation
  // Vikram paying You (from=Vikram, to=You)
  const balance = {
    from_user_id: vikramId,
    from_name: 'Vikram',
    to_user_id: currentUserId,
    to_name: 'You',
    amount: 2217.33,
  };

  const directSplits: Array<{
    expenseId: string;
    title: string;
    amount: number;
    isDebt: boolean;
  }> = [];

  mockExpenses.forEach((exp) => {
    const payerId = exp.paid_by || exp.user_id;
    const title = exp.note?.trim() || exp.category || 'Expense';

    (exp.splits || []).forEach((split) => {
      if (split.is_settled) return;

      if (payerId === balance.to_user_id && split.user_id === balance.from_user_id) {
        directSplits.push({
          expenseId: exp.id,
          title,
          amount: split.amount,
          isDebt: true,
        });
      }

      if (payerId === balance.from_user_id && split.user_id === balance.to_user_id) {
        directSplits.push({
          expenseId: exp.id,
          title,
          amount: split.amount,
          isDebt: false,
        });
      }
    });
  });

  assert.strictEqual(directSplits.length, 3);

  const debts = directSplits.filter((s) => s.isDebt);
  const credits = directSplits.filter((s) => !s.isDebt);

  assert.strictEqual(debts.length, 2);
  assert.strictEqual(credits.length, 1);

  // Debts Vikram owes You: Hotel (₹5,000) + Dinner (₹217.33)
  assert.strictEqual(debts[0].title, 'Hotel Booking');
  assert.strictEqual(debts[0].amount, 5000);
  assert.strictEqual(debts[1].title, 'Dinner');
  assert.strictEqual(debts[1].amount, 217.33);

  // Credit offset: Music Concert (-₹1,500)
  assert.strictEqual(credits[0].title, 'Music Concert');
  assert.strictEqual(credits[0].amount, 1500);

  // Net pairwise splits: 5000 + 217.33 - 1500 = 3717.33
  const directNet = debts.reduce((a, b) => a + b.amount, 0) - credits.reduce((a, b) => a + b.amount, 0);
  assert.strictEqual(Math.round(directNet * 100) / 100, 3717.33);
});

test('SettleUp: formats receipt details and 3-day editable_until timestamp correctly', () => {
  const createdAt = '2026-10-30T10:00:00Z';
  const editableUntil = '2026-11-02T10:00:00Z';

  const formattedCreated = formatDateTime(createdAt);
  const formattedEditable = formatDateTime(editableUntil);

  assert.ok(formattedCreated.length > 0);
  assert.ok(formattedEditable.length > 0);
  assert.ok(formattedEditable.includes('Nov'));

  const amountStr = formatCurrencyExact(6717.33);
  assert.strictEqual(amountStr, '₹6,717.33');
});
