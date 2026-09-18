import { test } from 'node:test';
import assert from 'node:assert';
import { formatCurrency, formatCurrencyExact } from './formatters';
import { buildFallbackLedger } from './monthlyLedgerHelpers';

test('Shared living math parity: ceil-rounded rent share', () => {
  const totalRent = 13500;
  const activeMembers = 7;
  const rentShare = Math.ceil(totalRent / activeMembers);

  assert.strictEqual(rentShare, 1929);
  assert.strictEqual(formatCurrencyExact(rentShare), '₹1,929.00');
});

test('Shared living member balance calculation: positive balance owes coordinator', () => {
  const rentShare = 1929;
  const sharedExpensesShare = 2360;
  const adjustments = 0;
  const totalExpense = rentShare + sharedExpensesShare + adjustments; // 4289
  const totalPaid = 2724; // Yash / roommate fronted 2724

  const balance = totalExpense - totalPaid; // 1565
  assert.strictEqual(balance, 1565);

  const action = balance > 0 ? 'pay_coordinator' : balance < 0 ? 'receive_refund' : 'settled';
  assert.strictEqual(action, 'pay_coordinator');
});

test('Shared living member balance calculation: negative balance receives refund', () => {
  const rentShare = 1929;
  const sharedExpensesShare = 2360;
  const totalExpense = rentShare + sharedExpensesShare; // 4289
  const totalPaid = 8268; // Yash fronted 8268

  const balance = totalExpense - totalPaid; // -3979
  assert.strictEqual(balance, -3979);

  const action = balance > 0 ? 'pay_coordinator' : balance < 0 ? 'receive_refund' : 'settled';
  assert.strictEqual(action, 'receive_refund');
  assert.strictEqual(Math.abs(balance), 3979);
});

test('Shared living UPI deep link URI formatting', () => {
  const upiId = 'yash@okhdfcbank';
  const name = 'Yash Pramukh';
  const amount = 1565.0;
  const note = 'July 2026 Household Dues';

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  assert.ok(upiUri.startsWith('upi://pay?'));
  assert.ok(upiUri.includes('pa=yash%40okhdfcbank'));
  assert.ok(upiUri.includes('am=1565.00'));
  assert.ok(upiUri.includes('cu=INR'));
});

test('Shared living dual progress calculation', () => {
  // Collections progress
  const totalExpectedCollections = 30023;
  const totalCollected = 16521;
  const collectionPct = Math.round((totalCollected / totalExpectedCollections) * 100);
  assert.strictEqual(collectionPct, 55);

  // Bill progress
  const totalRent = 13502;
  const disbursedRent = 13502;
  const billPct = Math.round((disbursedRent / totalRent) * 100);
  assert.strictEqual(billPct, 100);
});

test('buildFallbackLedger synthesizes complete MonthlyLedgerResponse matching actual screen components', () => {
  const members = [
    {
      id: 'm1',
      group_id: 'grp-1',
      user_id: 'user-1',
      role: 'admin',
      profile: { id: 'user-1', display_name: 'Pramukh Yash', email: 'yash@example.com' },
      joined_at: '2026-07-01T00:00:00Z',
    },
    {
      id: 'm2',
      group_id: 'grp-1',
      user_id: 'user-2',
      role: 'member',
      profile: { id: 'user-2', display_name: 'Dhairya', email: 'dhairya@example.com' },
      joined_at: '2026-07-01T00:00:00Z',
    },
  ];

  const expenses = [
    {
      id: 'exp-1',
      amount: 4000,
      category: 'groceries',
      note: 'Supermarket haul',
      expense_date: '2026-07-05T12:00:00Z',
      payer_name: 'Pramukh Yash',
      paid_by: 'user-1',
    },
  ];

  const memberStatuses = [
    {
      id: 's-1',
      settlement_id: 'set-1',
      user_id: 'user-1',
      is_completed: true,
    },
  ];

  const settlement = {
    id: 'set-1',
    group_id: 'grp-1',
    month: 7,
    year: 2026,
    status: 'open' as const,
    total_expenses: 4000,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  };

  const result = buildFallbackLedger({
    groupId: 'grp-1',
    groupName: 'Green Villa',
    month: 7,
    year: 2026,
    members: members as any,
    expenses,
    memberStatuses,
    settlement,
    currentUserId: 'user-2',
  });

  assert.ok(result);
  assert.strictEqual(result!.group_name, 'Green Villa');
  assert.strictEqual(result!.members.length, 2);
  assert.strictEqual(result!.summary.grand_total, 4000);

  // User 1 fronted 4000, share is 2000 -> balance is -2000 (refund due)
  const u1 = result!.members.find((m: any) => m.user_id === 'user-1');
  assert.ok(u1);
  assert.strictEqual(u1!.total_paid, 4000);
  assert.strictEqual(u1!.expense_share, 2000);
  assert.strictEqual(u1!.balance, -2000);

  // User 2 fronted 0, share is 2000 -> balance is 2000 (owes coordinator)
  const u2 = result!.members.find((m: any) => m.user_id === 'user-2');
  assert.ok(u2);
  assert.strictEqual(u2!.total_paid, 0);
  assert.strictEqual(u2!.expense_share, 2000);
  assert.strictEqual(u2!.balance, 2000);

  // Current user is User 2: action should be pay_coordinator with amount 2000
  assert.ok(result!.my_summary);
  assert.strictEqual(result!.my_summary!.action, 'pay_coordinator');
  assert.strictEqual(result!.my_summary!.amount, 2000);
  assert.strictEqual(result!.my_summary!.coordinator_name, 'Pramukh Yash');
});

