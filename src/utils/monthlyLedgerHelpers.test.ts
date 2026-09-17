import { test } from 'node:test';
import assert from 'node:assert';
import { formatCurrency, formatCurrencyExact } from './formatters';

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
