import test from 'node:test';
import assert from 'node:assert';
import {
  formatCurrency,
  formatCurrencyExact,
  formatDate,
  getInitials,
  getCurrentWeekDays,
  toLocalDateString,
} from './formatters';

test('formatCurrency should format numeric amounts into INR string', () => {
  assert.strictEqual(formatCurrency(1234), '₹1,234');
  assert.strictEqual(formatCurrency(0), '₹0');
  assert.strictEqual(formatCurrency(null), '₹0');
  assert.strictEqual(formatCurrency('5000'), '₹5,000');
});

test('formatCurrencyExact should format with 2 decimal places', () => {
  assert.strictEqual(formatCurrencyExact(1234.5), '₹1,234.50');
  assert.strictEqual(formatCurrencyExact(0), '₹0.00');
});

test('getInitials should extract uppercase initials correctly', () => {
  assert.strictEqual(getInitials('Dhairya Patel'), 'DP');
  assert.strictEqual(getInitials('Alice'), 'AL');
  assert.strictEqual(getInitials(null, 'user@example.com'), 'US');
  assert.strictEqual(getInitials(null, null), 'ST');
});

test('getCurrentWeekDays should return 7 days and correctly flag done days', () => {
  const today = toLocalDateString(new Date());
  const week = getCurrentWeekDays([today]);

  assert.strictEqual(week.length, 7);
  assert.deepStrictEqual(
    week.map((d) => d.dayName),
    ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  );

  const todayItem = week.find((d) => d.isToday);
  assert.ok(todayItem, 'Today should be present in current week');
  assert.strictEqual(todayItem?.isDone, true, 'Today should be flagged as done');
});
