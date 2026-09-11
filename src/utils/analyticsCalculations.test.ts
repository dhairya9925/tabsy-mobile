import { test } from 'node:test';
import assert from 'node:assert';
import {
  computeCategoryBreakdown,
  computeSixMonthTrend,
  computeWeeklyRhythm,
  computeMonthComparison,
  getCategoryColor,
  prettifyCategoryLabel,
} from './analyticsCalculations';
import { PersonalExpense, GroupUserSplitItem } from '../types';

test('prettifyCategoryLabel maps standard and slug categories', () => {
  assert.strictEqual(prettifyCategoryLabel('food'), 'Food & Dining');
  assert.strictEqual(prettifyCategoryLabel('transport'), 'Transport');
  assert.strictEqual(prettifyCategoryLabel('bills'), 'Bills & Utilities');
  assert.strictEqual(prettifyCategoryLabel('custom_groceries'), 'Custom Groceries');
});

test('getCategoryColor returns muted chart tokens for standard categories', () => {
  assert.strictEqual(getCategoryColor('food'), '#C89D57');
  assert.strictEqual(getCategoryColor('food & dining'), '#C89D57');
  assert.strictEqual(getCategoryColor('transport'), '#4C7965');
  assert.strictEqual(getCategoryColor('travel'), '#4C7965');
  assert.strictEqual(getCategoryColor('shopping'), '#B97C83');
  assert.strictEqual(getCategoryColor('bills'), '#718AA0');
  assert.strictEqual(getCategoryColor('bills & utilities'), '#718AA0');
  assert.strictEqual(getCategoryColor('entertainment'), '#897A98');
  assert.strictEqual(getCategoryColor('other'), '#7A867D');
});

test('getCategoryColor returns deterministic fallback color regardless of index or order', () => {
  const color1 = getCategoryColor('my_custom_pet_care', 0);
  const color2 = getCategoryColor('my_custom_pet_care', 5);
  const color3 = getCategoryColor('  MY_CUSTOM_PET_CARE  ');
  assert.strictEqual(color1, color2);
  assert.strictEqual(color1, color3);
  assert.strictEqual(typeof color1, 'string');
});

test('computeCategoryBreakdown preserves category color across All and Personal modes', () => {
  const personalExpenses: PersonalExpense[] = [
    {
      id: '1',
      user_id: 'u1',
      amount: 400,
      category: 'custom_books',
      expense_date: '2026-09-02',
      created_at: '',
      updated_at: '',
    },
  ];
  const groupSplits: GroupUserSplitItem[] = [
    {
      id: 's1',
      expense_date: '2026-09-03',
      category: 'custom_books',
      amount: 600,
      group_id: 'g1',
    },
    {
      id: 's2',
      expense_date: '2026-09-04',
      category: 'food',
      amount: 1000,
      group_id: 'g1',
    },
  ];

  const personalRes = computeCategoryBreakdown(personalExpenses, groupSplits, 'personal', '2026-09');
  const allRes = computeCategoryBreakdown(personalExpenses, groupSplits, 'all', '2026-09');

  const personalBookSlice = personalRes.slices.find((s) => s.categoryId === 'custom_books');
  const allBookSlice = allRes.slices.find((s) => s.categoryId === 'custom_books');

  assert.ok(personalBookSlice);
  assert.ok(allBookSlice);
  assert.strictEqual(personalBookSlice?.color, allBookSlice?.color);
});


test('computeCategoryBreakdown aggregates personal expenses only in personal mode', () => {
  const personalExpenses: PersonalExpense[] = [
    {
      id: '1',
      user_id: 'u1',
      amount: 500,
      category: 'food',
      expense_date: '2026-09-02',
      created_at: '',
      updated_at: '',
    },
    {
      id: '2',
      user_id: 'u1',
      amount: 300,
      category: 'transport',
      expense_date: '2026-09-05',
      created_at: '',
      updated_at: '',
    },
    {
      id: '3',
      user_id: 'u1',
      amount: 200,
      category: 'food',
      expense_date: '2026-08-15', // different month
      created_at: '',
      updated_at: '',
    },
  ];

  const groupSplits: GroupUserSplitItem[] = [
    {
      id: 's1',
      expense_date: '2026-09-03',
      category: 'food',
      amount: 200,
      group_id: 'g1',
    },
  ];

  const res = computeCategoryBreakdown(personalExpenses, groupSplits, 'personal', '2026-09');

  assert.strictEqual(res.total, 800);
  assert.strictEqual(res.slices.length, 2);
  assert.strictEqual(res.slices[0].categoryId, 'food');
  assert.strictEqual(res.slices[0].value, 500);
  assert.strictEqual(res.slices[0].percentage, 63); // 500/800 = 62.5% -> 63%
  assert.strictEqual(res.slices[1].categoryId, 'transport');
  assert.strictEqual(res.slices[1].value, 300);
  assert.strictEqual(res.slices[1].percentage, 38);
});

test('computeCategoryBreakdown combines personal and group splits in all mode', () => {
  const personalExpenses: PersonalExpense[] = [
    {
      id: '1',
      user_id: 'u1',
      amount: 500,
      category: 'food',
      expense_date: '2026-09-02',
      created_at: '',
      updated_at: '',
    },
  ];

  const groupSplits: GroupUserSplitItem[] = [
    {
      id: 's1',
      expense_date: '2026-09-03',
      category: 'food',
      amount: 300,
      group_id: 'g1',
    },
    {
      id: 's2',
      expense_date: '2026-09-04',
      category: 'shopping',
      amount: 200,
      group_id: 'g1',
    },
  ];

  const res = computeCategoryBreakdown(personalExpenses, groupSplits, 'all', '2026-09');

  assert.strictEqual(res.total, 1000);
  assert.strictEqual(res.slices.length, 2);
  assert.strictEqual(res.slices[0].categoryId, 'food');
  assert.strictEqual(res.slices[0].value, 800); // 500 + 300
  assert.strictEqual(res.slices[0].percentage, 80);
  assert.strictEqual(res.slices[1].categoryId, 'shopping');
  assert.strictEqual(res.slices[1].value, 200);
  assert.strictEqual(res.slices[1].percentage, 20);
});

test('computeSixMonthTrend generates 6 continuous chronological months', () => {
  const refDate = new Date('2026-09-15T12:00:00Z');
  const personalExpenses: PersonalExpense[] = [
    {
      id: '1',
      user_id: 'u1',
      amount: 1200,
      category: 'food',
      expense_date: '2026-09-02',
      created_at: '',
      updated_at: '',
    },
    {
      id: '2',
      user_id: 'u1',
      amount: 800,
      category: 'bills',
      expense_date: '2026-08-10',
      created_at: '',
      updated_at: '',
    },
  ];

  const groupSplits: GroupUserSplitItem[] = [
    {
      id: 's1',
      expense_date: '2026-09-05',
      category: 'entertainment',
      amount: 500,
      group_id: 'g1',
    },
  ];

  const trend = computeSixMonthTrend(personalExpenses, groupSplits, refDate);

  assert.strictEqual(trend.length, 6);
  // Last item should be 2026-09
  const lastItem = trend[5];
  assert.strictEqual(lastItem.key, '2026-09');
  assert.strictEqual(lastItem.personal, 1200);
  assert.strictEqual(lastItem.groupShare, 500);
  assert.strictEqual(lastItem.total, 1700);

  // Second to last should be 2026-08
  const prevItem = trend[4];
  assert.strictEqual(prevItem.key, '2026-08');
  assert.strictEqual(prevItem.personal, 800);
  assert.strictEqual(prevItem.groupShare, 0);
  assert.strictEqual(prevItem.total, 800);
});

test('computeWeeklyRhythm maps 7 days of the week', () => {
  // Wednesday, Sept 9, 2026
  const refDate = new Date('2026-09-09T10:00:00Z');
  const personalExpenses: PersonalExpense[] = [
    {
      id: '1',
      user_id: 'u1',
      amount: 250,
      category: 'food',
      expense_date: '2026-09-09',
      created_at: '',
      updated_at: '',
    },
    {
      id: '2',
      user_id: 'u1',
      amount: 400,
      category: 'travel',
      expense_date: '2026-09-07', // Monday
      created_at: '',
      updated_at: '',
    },
  ];

  const rhythm = computeWeeklyRhythm(personalExpenses, refDate);

  assert.strictEqual(rhythm.days.length, 7);
  assert.strictEqual(rhythm.daysLogged, 2);
  assert.strictEqual(rhythm.weekTotal, 650);
  assert.strictEqual(rhythm.maxDayAmount, 400);

  // Monday
  assert.strictEqual(rhythm.days[0].dayLabel, 'M');
  assert.strictEqual(rhythm.days[0].amount, 400);
  assert.strictEqual(rhythm.days[0].hasActivity, true);

  // Wednesday
  assert.strictEqual(rhythm.days[2].dayLabel, 'W');
  assert.strictEqual(rhythm.days[2].amount, 250);
  assert.strictEqual(rhythm.days[2].isToday, true);
});

test('computeMonthComparison handles decrease, increase, and zero cases', () => {
  const less = computeMonthComparison(1000, 1500);
  assert.strictEqual(less.trend, 'less');
  assert.strictEqual(less.pct, 33);
  assert.strictEqual(less.label, '33% less than last month');

  const more = computeMonthComparison(1500, 1000);
  assert.strictEqual(more.trend, 'more');
  assert.strictEqual(more.pct, 50);
  assert.strictEqual(more.label, '50% more than last month');

  const same = computeMonthComparison(1000, 1000);
  assert.strictEqual(same.trend, 'same');
  assert.strictEqual(same.pct, 0);

  const zeroPrev = computeMonthComparison(500, 0);
  assert.strictEqual(zeroPrev.trend, 'more');
  assert.strictEqual(zeroPrev.pct, 100);
});
