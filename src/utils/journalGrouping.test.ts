import test from 'node:test';
import assert from 'node:assert';
import {
  getMonthKeyFromDate,
  formatMonthTitle,
  formatMonthChipLabel,
  extractAvailableMonths,
  groupExpensesByMonth,
} from './journalGrouping';
import { PersonalExpense } from '../types';

const mockExpenses: PersonalExpense[] = [
  {
    id: 'exp-1',
    user_id: 'u1',
    amount: 500,
    category: 'food',
    expense_date: '2026-09-11',
    created_at: '2026-09-11T10:00:00Z',
    updated_at: '2026-09-11T10:00:00Z',
  },
  {
    id: 'exp-2',
    user_id: 'u1',
    amount: 1500,
    category: 'shopping',
    expense_date: '2026-09-10',
    created_at: '2026-09-10T15:00:00Z',
    updated_at: '2026-09-10T15:00:00Z',
  },
  {
    id: 'exp-3',
    user_id: 'u1',
    amount: 2000,
    category: 'transport',
    expense_date: '2026-08-31',
    created_at: '2026-08-31T09:00:00Z',
    updated_at: '2026-08-31T09:00:00Z',
  },
  {
    id: 'exp-4',
    user_id: 'u1',
    amount: 800,
    category: 'food',
    expense_date: '2026-08-15',
    created_at: '2026-08-15T12:00:00Z',
    updated_at: '2026-08-15T12:00:00Z',
  },
];

test('getMonthKeyFromDate extracts YYYY-MM correctly', () => {
  assert.strictEqual(getMonthKeyFromDate('2026-09-11'), '2026-09');
  assert.strictEqual(getMonthKeyFromDate('2026-08-31T00:00:00Z'), '2026-08');
  assert.strictEqual(getMonthKeyFromDate(null), 'other');
  assert.strictEqual(getMonthKeyFromDate(''), 'other');
});

test('formatMonthTitle formats human readable title', () => {
  assert.strictEqual(formatMonthTitle('2026-09'), 'September 2026');
  assert.strictEqual(formatMonthTitle('2026-08'), 'August 2026');
  assert.strictEqual(formatMonthTitle('other'), 'Earlier Records');
});

test('formatMonthChipLabel formats compact chip label', () => {
  assert.strictEqual(formatMonthChipLabel('2026-09'), 'Sep 2026');
  assert.strictEqual(formatMonthChipLabel('2026-08'), 'Aug 2026');
  assert.strictEqual(formatMonthChipLabel('other'), 'Earlier');
});

test('extractAvailableMonths extracts and aggregates all distinct months in descending order', () => {
  const months = extractAvailableMonths(mockExpenses);
  assert.strictEqual(months.length, 2);
  assert.strictEqual(months[0].key, '2026-09');
  assert.strictEqual(months[0].count, 2);
  assert.strictEqual(months[0].total, 2000);
  assert.strictEqual(months[1].key, '2026-08');
  assert.strictEqual(months[1].count, 2);
  assert.strictEqual(months[1].total, 2800);
});

test('groupExpensesByMonth groups expenses into distinct month sections with day groups', () => {
  const refDate = new Date('2026-09-11T12:00:00');
  const sections = groupExpensesByMonth(mockExpenses, refDate);

  assert.strictEqual(sections.length, 2);

  // First month: September 2026
  const sep = sections[0];
  assert.strictEqual(sep.monthKey, '2026-09');
  assert.strictEqual(sep.monthTitle, 'September 2026');
  assert.strictEqual(sep.monthTag, 'CURRENT MONTH');
  assert.strictEqual(sep.isCurrentMonth, true);
  assert.strictEqual(sep.isPreviousMonth, false);
  assert.strictEqual(sep.totalSpent, 2000);
  assert.strictEqual(sep.expenseCount, 2);
  assert.strictEqual(sep.dayGroups.length, 2);
  assert.strictEqual(sep.dayGroups[0].dateLabel, 'TODAY');
  assert.strictEqual(sep.dayGroups[0].dayTotal, 500);
  assert.strictEqual(sep.dayGroups[1].dateLabel, 'YESTERDAY');
  assert.strictEqual(sep.dayGroups[1].dayTotal, 1500);
  assert.ok(sep.topCategories.includes('food'));

  // Second month: August 2026
  const aug = sections[1];
  assert.strictEqual(aug.monthKey, '2026-08');
  assert.strictEqual(aug.monthTitle, 'August 2026');
  assert.strictEqual(aug.monthTag, 'PREVIOUS MONTH');
  assert.strictEqual(aug.isCurrentMonth, false);
  assert.strictEqual(aug.isPreviousMonth, true);
  assert.strictEqual(aug.totalSpent, 2800);
  assert.strictEqual(aug.expenseCount, 2);
  assert.strictEqual(aug.dayGroups.length, 2);
});

test('month navigation stepping finds chronological prev and next correctly', () => {
  const months = extractAvailableMonths(mockExpenses);
  // months: [ { key: '2026-09' }, { key: '2026-08' } ]
  assert.strictEqual(months.length, 2);

  const idxSep = months.findIndex((m) => m.key === '2026-09');
  const idxAug = months.findIndex((m) => m.key === '2026-08');

  // Next in time from August is September (idx - 1)
  assert.strictEqual(idxAug > 0, true);
  assert.strictEqual(months[idxAug - 1].key, '2026-09');

  // Prev in time from September is August (idx + 1)
  assert.strictEqual(idxSep < months.length - 1, true);
  assert.strictEqual(months[idxSep + 1].key, '2026-08');

  // September has no next (latest month)
  assert.strictEqual(idxSep > 0, false);

  // August has no prev (earliest month)
  assert.strictEqual(idxAug < months.length - 1, false);
});

