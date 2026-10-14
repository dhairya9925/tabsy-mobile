import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from '../services/offline/storage';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { buildDashboardFromLocalCache } from './localDashboardBuilder';
import { PersonalExpense, Group, FriendBalance } from '../types';

beforeEach(async () => {
  await appStorage.clear();
});

test('buildDashboardFromLocalCache returns valid empty baseline when cache is empty', async () => {
  const data = await buildDashboardFromLocalCache();
  assert.equal(data.personalTotal, 0);
  assert.equal(data.personalPrevMonthTotal, 0);
  assert.equal(data.personalExpenseCount, 0);
  assert.deepEqual(data.personalExpenses, []);
  assert.deepEqual(data.groups, []);
  assert.deepEqual(data.friendBalances, []);
  assert.equal(data.netBalance, 0);
  assert.equal(data.recentActivity.length, 0);
});

test('buildDashboardFromLocalCache computes current and previous month personal totals', async () => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const mockExpenses: Partial<PersonalExpense>[] = [
    {
      id: 'e1',
      amount: 450,
      expense_date: `${currentMonth}-05`,
      category: 'Food',
      note: 'Lunch with team',
      created_at: `${currentMonth}-05T12:00:00Z`,
    },
    {
      id: 'e2',
      amount: 550,
      expense_date: `${currentMonth}-10`,
      category: 'Transit',
      note: 'Metro pass',
      created_at: `${currentMonth}-10T12:00:00Z`,
    },
    {
      id: 'e3',
      amount: 800,
      expense_date: `${prevMonth}-15`,
      category: 'Shopping',
      note: 'Shoes',
      created_at: `${prevMonth}-15T12:00:00Z`,
    },
  ];

  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, mockExpenses);

  const data = await buildDashboardFromLocalCache();

  assert.equal(data.personalTotal, 1000);
  assert.equal(data.personalPrevMonthTotal, 800);
  assert.equal(data.personalExpenseCount, 2);
  assert.equal(data.unifiedTotal, 1000);
  assert.equal(data.unifiedPrevMonthTotal, 800);
  assert.equal(data.monthOverMonthPct, 25);
  assert.equal(data.recentActivity.length, 3);
  assert.equal(data.recentActivity[0].id, 'e2'); // latest first
});

test('buildDashboardFromLocalCache aggregates friend and group balances correctly', async () => {
  const mockGroups: Partial<Group>[] = [
    { id: 'g1', name: 'Flat 402', type: 'shared_living' },
  ];
  const mockFriendBalances: FriendBalance[] = [
    { friendId: 'f1', netBalance: 600 },  // friend owes user 600
    { friendId: 'f2', netBalance: -250 }, // user owes friend 250
  ];
  const mockGroupBalances: Record<string, number> = {
    g1: -100, // user owes group 100
  };

  await cacheService.set(CACHE_KEYS.GROUPS_LIST, mockGroups);
  await cacheService.set(CACHE_KEYS.FRIEND_BALANCES, mockFriendBalances);
  await cacheService.set(CACHE_KEYS.GROUP_BALANCES, mockGroupBalances);

  const data = await buildDashboardFromLocalCache();

  assert.equal(data.groups.length, 1);
  assert.equal(data.friendBalances.length, 2);
  assert.equal(data.netOwed, 600);
  assert.equal(data.netOwes, 350); // 250 (friend) + 100 (group)
  assert.equal(data.netBalance, 250);
  assert.equal(data.unsettledCount, 3);
});
