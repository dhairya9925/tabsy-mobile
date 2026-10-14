import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from './storage';
import { cacheService, CACHE_KEYS } from './cacheService';
import { outboxService } from './outboxService';
import { networkService } from './networkService';
import { friendsApi } from '../../api/friends';
import { dashboardApi } from '../../api/dashboard';
import { groupsApi } from '../../api/groups';
import { expensesApi } from '../../api/expenses';
import { categoriesApi } from '../../api/categories';

beforeEach(async () => {
  await appStorage.clear();
  await outboxService.clear();
});

test('appStorage: set, get, remove, and getAllKeys', async () => {
  await appStorage.setItem('test_key', { foo: 'bar', num: 42 });
  const val = await appStorage.getItem<{ foo: string; num: number }>('test_key');
  assert.deepEqual(val, { foo: 'bar', num: 42 });

  const keys = await appStorage.getAllKeys();
  assert.ok(keys.includes('test_key'));

  await appStorage.removeItem('test_key');
  const deleted = await appStorage.getItem('test_key');
  assert.equal(deleted, null);
});

test('cacheService: set, get, and TTL expiration', async () => {
  await cacheService.set('test_cache', { message: 'hello' }, 1000); // 1s TTL
  const cached = await cacheService.get<{ message: string }>('test_cache');
  assert.deepEqual(cached, { message: 'hello' });

  // Test expiration with 0ms TTL
  await cacheService.set('expired_cache', { old: true }, -10);
  const expired = await cacheService.get('expired_cache');
  assert.equal(expired, null);
});

test('cacheService: invalidate and invalidatePattern', async () => {
  await cacheService.set('cache:group:1', { name: 'Group 1' });
  await cacheService.set('cache:group:2', { name: 'Group 2' });
  await cacheService.set('cache:other', { name: 'Other' });

  await cacheService.invalidatePattern('cache:group:');

  assert.equal(await cacheService.get('cache:group:1'), null);
  assert.equal(await cacheService.get('cache:group:2'), null);
  assert.deepEqual(await cacheService.get('cache:other'), { name: 'Other' });
});

test('outboxService: enqueue and queue persistence', async () => {
  networkService.setSimulatedOnline(false); // Simulate offline

  const tempId = await outboxService.enqueue('create_personal_expense', {
    amount: 250,
    category: 'food',
    note: 'Offline lunch',
  });

  assert.ok(tempId.startsWith('temp-exp-'));
  assert.equal(outboxService.getPendingCount(), 1);

  const queue = outboxService.getQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'create_personal_expense');
  assert.equal(queue[0].payload.amount, 250);

  // Remove action
  await outboxService.remove(queue[0].id);
  assert.equal(outboxService.getPendingCount(), 0);
});

test('networkService: online status and subscription', async () => {
  let observedOnline = false;
  const unsub = networkService.subscribe((status) => {
    observedOnline = status;
  });

  networkService.setSimulatedOnline(true);
  assert.equal(observedOnline, true);
  assert.equal(networkService.isOnline(), true);

  networkService.setSimulatedOnline(false);
  assert.equal(observedOnline, false);
  assert.equal(networkService.isOnline(), false);

  unsub();
});

test('friendsApi.getFriends returns cached data when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockFriends: any[] = [{ id: 'fr-1', user_id: 'u1', friend_id: 'u2', status: 'accepted' }];
  await cacheService.set(CACHE_KEYS.FRIENDS_LIST, mockFriends);

  const friends = await friendsApi.getFriends();
  assert.deepEqual(friends, mockFriends);
});

test('friendsApi.getFriendBalances returns cached data when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockBalances: any[] = [{ friendId: 'f1', netBalance: 450 }];
  await cacheService.set(CACHE_KEYS.FRIEND_BALANCES, mockBalances);

  const balances = await friendsApi.getFriendBalances();
  assert.deepEqual(balances, mockBalances);
});

test('dashboardApi.getSummary returns cached dashboard data when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockSummary: any = { personalTotal: 1200, personalExpenseCount: 5 };
  await cacheService.set(CACHE_KEYS.INSIGHT_DASHBOARD_DATA, mockSummary);

  const summary = await dashboardApi.getSummary();
  assert.equal(summary.personalTotal, 1200);
});

test('dashboardApi.getSummary falls back to buildDashboardFromLocalCache when no summary is cached', async () => {
  networkService.setSimulatedOnline(false);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [
    { id: 'exp-1', amount: 350, expense_date: `${currentMonth}-02` },
  ]);

  const summary = await dashboardApi.getSummary();
  assert.equal(summary.personalTotal, 350);
  assert.equal(summary.personalExpenseCount, 1);
});

test('groupsApi.getGroups and getGroup return cached data when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockGroups: any[] = [
    { id: 'grp-1', name: 'Apartment 4B', type: 'shared_living' },
    { id: 'grp-2', name: 'Goa Trip', type: 'trip' },
  ];
  await cacheService.set(CACHE_KEYS.GROUPS_LIST, mockGroups);

  const groups = await groupsApi.getGroups();
  assert.deepEqual(groups, mockGroups);

  const group1 = await groupsApi.getGroup('grp-1');
  assert.equal(group1.name, 'Apartment 4B');
});

test('groupsApi.getGroupMembers and getGroupExpenses return cached data when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockMembers: any[] = [{ id: 'm-1', user_id: 'u-1', role: 'admin' }];
  const mockExpenses: any[] = [{ id: 'ge-1', amount: 800, category: 'Groceries' }];

  await cacheService.set(CACHE_KEYS.GROUP_MEMBERS('grp-1'), mockMembers);
  await cacheService.set(CACHE_KEYS.GROUP_EXPENSES('grp-1'), mockExpenses);

  const members = await groupsApi.getGroupMembers('grp-1');
  assert.deepEqual(members, mockMembers);

  const expenses = await groupsApi.getGroupExpenses('grp-1');
  assert.deepEqual(expenses, mockExpenses);
});

test('friendsApi.getFriendProfile and getFriendExpenses return cached data when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockProfile: any = { id: 'prof-1', display_name: 'Alex Doe', email: 'alex@tabsy.app' };
  const mockExpenses: any[] = [{ id: 'fe-1', amount: 300, category: 'Coffee' }];

  await cacheService.set(CACHE_KEYS.FRIEND_PROFILE('fr-1'), mockProfile);
  await cacheService.set(CACHE_KEYS.FRIEND_EXPENSES('fr-1'), mockExpenses);

  const profile = await friendsApi.getFriendProfile('fr-1');
  assert.equal(profile.display_name, 'Alex Doe');

  const expenses = await friendsApi.getFriendExpenses('fr-1');
  assert.deepEqual(expenses, mockExpenses);
});

test('categoriesApi.getCategories returns cached categories when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockCats: any[] = [
    { id: 'c-1', name: 'Food & Dining', is_default: true },
    { id: 'c-2', name: 'Utilities', is_default: true },
  ];
  await cacheService.set(CACHE_KEYS.CATEGORIES, mockCats);

  const cats = await categoriesApi.getCategories();
  assert.deepEqual(cats, mockCats);
});

test('expensesApi.getPersonalExpenses returns locally filtered expenses when offline', async () => {
  networkService.setSimulatedOnline(false);
  const mockExpenses: any[] = [
    { id: 'pe-1', amount: 400, category: 'Food', expense_date: '2026-10-01', note: 'Burger' },
    { id: 'pe-2', amount: 1200, category: 'Transit', expense_date: '2026-10-05', note: 'Uber cab' },
  ];
  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, mockExpenses);

  // Filter by category offline
  const filtered = await expensesApi.getPersonalExpenses({ category: 'Food' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'pe-1');

  // Search query offline
  const searched = await expensesApi.getPersonalExpenses({ search: 'uber' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'pe-2');
});


