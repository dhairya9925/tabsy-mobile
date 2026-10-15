import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from './storage';
import { cacheService, CACHE_KEYS } from './cacheService';
import { outboxService, isOfflineId } from './outboxService';
import { networkService } from './networkService';
import { apiClient } from '../../api/client';
import { expensesApi } from '../../api/expenses';
import { friendsApi } from '../../api/friends';
import { groupsApi } from '../../api/groups';
import { categoriesApi } from '../../api/categories';
import { dashboardApi } from '../../api/dashboard';
import { localAnalyticsEngine } from '../../utils/localAnalyticsEngine';
import { buildDashboardFromLocalCache } from '../../utils/localDashboardBuilder';
import { FriendRecord, Group } from '../../types';

beforeEach(async () => {
  await appStorage.clear();
  await outboxService.clear();
  networkService.setSimulatedOnline(true);
});

// -----------------------------------------------------------------------------
// Scenario 1: Cold start offline with empty cache (never cached)
// -----------------------------------------------------------------------------
test('Scenario 1: Cold start offline with empty cache gracefully returns baselines', async () => {
  networkService.setSimulatedOnline(false);

  // 1. Dashboard summary returns baseline DashboardData
  const summary = await dashboardApi.getSummary();
  assert.ok(summary);
  assert.equal(summary.personalTotal, 0);
  assert.equal(summary.unifiedTotal, 0);
  assert.deepEqual(summary.recentActivity, []);
  assert.deepEqual(summary.personalExpenses, []);

  // 2. Personal expenses returns empty list
  const expenses = await expensesApi.getPersonalExpenses();
  assert.deepEqual(expenses, []);

  // 3. Friends returns empty list
  const friends = await friendsApi.getFriends();
  assert.deepEqual(friends, []);

  // 4. Friend balances returns empty array
  const balances = await friendsApi.getFriendBalances();
  assert.ok(Array.isArray(balances));
  assert.equal(balances.length, 0);

  // 5. Groups returns empty list
  const groups = await groupsApi.getGroups();
  assert.deepEqual(groups, []);

  // 6. Categories returns empty list when offline and never cached
  const categories = await categoriesApi.getCategories();
  assert.ok(Array.isArray(categories));
  assert.equal(categories.length, 0);
});

// -----------------------------------------------------------------------------
// Scenario 2: Cold start offline with populated cache
// -----------------------------------------------------------------------------
test('Scenario 2: Cold start offline with populated cache returns cached data immediately', async () => {
  const mockFriend: FriendRecord = {
    id: 'fr-1',
    user_id: 'user-me',
    friend_id: 'alice-id',
    status: 'accepted',
    created_at: '2026-10-15',
    updated_at: '2026-10-15',
    profile: {
      user_id: 'alice-id',
      display_name: 'Alice',
      email: 'alice@example.com',
      is_shadow: false,
    },
  };

  const mockGroup: Group = {
    id: 'grp-1',
    name: 'Flatmates',
    type: 'shared_living',
    created_by: 'user-me',
    created_at: '2026-10-15',
    updated_at: '2026-10-15',
  };

  // Pre-seed cache
  await cacheService.set(CACHE_KEYS.FRIENDS_LIST, [mockFriend]);
  await cacheService.set(CACHE_KEYS.GROUPS_LIST, [mockGroup]);
  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [
    { id: 'exp-1', amount: 150, category: 'Food', expense_date: '2026-10-15' },
  ]);

  networkService.setSimulatedOnline(false);

  const friends = await friendsApi.getFriends();
  assert.equal(friends.length, 1);
  assert.equal(friends[0].profile?.display_name, 'Alice');

  const groups = await groupsApi.getGroups();
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, 'Flatmates');

  const expenses = await expensesApi.getPersonalExpenses();
  assert.equal(expenses.length, 1);
  assert.equal(expenses[0].amount, 150);
});

// -----------------------------------------------------------------------------
// Scenario 3: Create expense offline -> reconcile on sync
// -----------------------------------------------------------------------------
test('Scenario 3: Create expense offline and reconcile with server ID on sync', async () => {
  networkService.setSimulatedOnline(false);

  // 1. Create personal expense offline
  const created = await expensesApi.createPersonalExpense({
    amount: 320,
    category: 'groceries',
    note: 'Fresh veggies',
    expense_date: '2026-10-15',
  });

  assert.ok(isOfflineId(created.id));
  assert.equal(created.is_pending_sync, true);

  // Cache contains optimistic expense
  const cachedExpenses = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cachedExpenses?.length, 1);
  assert.equal(cachedExpenses?.[0].id, created.id);
  assert.equal(cachedExpenses?.[0].is_pending_sync, true);

  // Outbox holds the creation action
  assert.equal(outboxService.getQueue().length, 1);

  // 2. Mock successful backend dispatch before going online
  const originalPost = apiClient.post;
  apiClient.post = async () => ({
    id: 'srv-exp-888',
    amount: 320,
    category: 'groceries',
    note: 'Fresh veggies',
    expense_date: '2026-10-15',
  }) as any;

  try {
    // Go online to trigger automatic outbox replay
    networkService.setSimulatedOnline(true);
    await outboxService.waitForSync();

    // Outbox queue is now empty
    assert.equal(outboxService.getQueue().length, 0);

    // Cache is reconciled: tempId replaced with server ID, is_pending_sync cleared
    const updatedCache = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
    assert.equal(updatedCache?.length, 1);
    assert.equal(updatedCache?.[0].id, 'srv-exp-888');
    assert.equal(updatedCache?.[0].is_pending_sync, false);
  } finally {
    apiClient.post = originalPost;
  }
});

// -----------------------------------------------------------------------------
// Scenario 4: Update expense offline -> reconcile on sync
// -----------------------------------------------------------------------------
test('Scenario 4: Update expense offline and reconcile on sync', async () => {
  // Pre-seed server expense in cache
  const serverExpense = {
    id: 'srv-exp-100',
    amount: 100,
    category: 'transport',
    note: 'Metro',
    expense_date: '2026-10-14',
    is_pending_sync: false,
  };
  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [serverExpense]);

  // Go offline and update
  networkService.setSimulatedOnline(false);

  const updated = await expensesApi.updatePersonalExpense('srv-exp-100', {
    amount: 140,
    note: 'Metro + Auto',
  });

  assert.equal(updated.amount, 140);
  assert.equal(updated.note, 'Metro + Auto');
  assert.equal(updated.is_pending_sync, true);

  // Check cache has updated fields and is_pending_sync
  const cached = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cached?.[0].amount, 140);
  assert.equal(cached?.[0].is_pending_sync, true);

  // Mock patch before reconnecting
  const originalPatch = apiClient.patch;
  apiClient.patch = async () => ({
    ...serverExpense,
    amount: 140,
    note: 'Metro + Auto',
  }) as any;

  try {
    // Reconnect and wait for auto-sync
    networkService.setSimulatedOnline(true);
    await outboxService.waitForSync();

    assert.equal(outboxService.getQueue().length, 0);

    // Reconciled cache: pending sync cleared
    const reconciled = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
    assert.equal(reconciled?.[0].amount, 140);
    assert.equal(reconciled?.[0].is_pending_sync, false);
  } finally {
    apiClient.patch = originalPatch;
  }
});

// -----------------------------------------------------------------------------
// Scenario 5: Delete expense offline -> dispatch on sync
// -----------------------------------------------------------------------------
test('Scenario 5: Delete expense offline removes from cache and dispatches on sync', async () => {
  const serverExpense = {
    id: 'srv-exp-200',
    amount: 500,
    category: 'shopping',
    expense_date: '2026-10-14',
  };
  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [serverExpense]);

  networkService.setSimulatedOnline(false);

  // Delete offline
  await expensesApi.deletePersonalExpense('srv-exp-200');

  // Immediately removed from local cache
  const cached = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cached?.length, 0);

  // Queued in outbox
  assert.equal(outboxService.getQueue().length, 1);
  assert.equal(outboxService.getQueue()[0].type, 'delete_personal_expense');

  // Mock delete before reconnecting
  const originalDelete = apiClient.delete;
  apiClient.delete = async () => ({}) as any;

  try {
    networkService.setSimulatedOnline(true);
    await outboxService.waitForSync();

    assert.equal(outboxService.getQueue().length, 0);
  } finally {
    apiClient.delete = originalDelete;
  }
});

// -----------------------------------------------------------------------------
// Scenario 6: Create then delete same item offline cancels out
// -----------------------------------------------------------------------------
test('Scenario 6: Create then delete same item offline cancels out without hitting server', async () => {
  networkService.setSimulatedOnline(false);

  const created = await expensesApi.createPersonalExpense({
    amount: 75,
    category: 'snacks',
    expense_date: '2026-10-15',
  });

  assert.ok(isOfflineId(created.id));
  assert.equal(outboxService.getQueue().length, 1);

  // Delete the same temporary item offline
  await expensesApi.deletePersonalExpense(created.id);

  // Both operations cancelled out completely from outbox
  assert.equal(outboxService.getQueue().length, 0);

  // Cache is clean
  const cached = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cached?.length, 0);
});

// -----------------------------------------------------------------------------
// Scenario 7: Network drops mid-sync pauses queue cleanly
// -----------------------------------------------------------------------------
test('Scenario 7: Network drops mid-sync pauses replay and retains remaining actions', async () => {
  networkService.setSimulatedOnline(false);

  // Enqueue 3 actions offline
  await outboxService.enqueue('create_personal_expense', { id: 'temp-1', amount: 10 });
  await outboxService.enqueue('create_personal_expense', { id: 'temp-2', amount: 20 });
  await outboxService.enqueue('create_personal_expense', { id: 'temp-3', amount: 30 });

  assert.equal(outboxService.getQueue().length, 3);

  const originalPost = apiClient.post;
  let callCount = 0;

  apiClient.post = async () => {
    callCount++;
    if (callCount === 1) {
      // First action succeeds, but network drops immediately during replay
      networkService.setSimulatedOnline(false);
      return { id: 'srv-1', amount: 10 } as any;
    }
    return { id: 'srv-next', amount: 99 } as any;
  };

  try {
    // Go online to trigger sync
    networkService.setSimulatedOnline(true);
    await outboxService.waitForSync();

    // Remaining 2 actions are safely preserved in outbox
    const remainingQueue = outboxService.getQueue();
    assert.equal(remainingQueue.length, 2);
    assert.equal(remainingQueue[0].payload.amount, 20);
    assert.equal(remainingQueue[1].payload.amount, 30);
  } finally {
    apiClient.post = originalPost;
    networkService.setSimulatedOnline(true);
  }
});

// -----------------------------------------------------------------------------
// Scenario 8: Local Analytics Engine resilience
// -----------------------------------------------------------------------------
test('Scenario 8: Local Analytics Engine computes safely with zero or full data', async () => {
  // Empty baseline from local dashboard builder
  const emptyDashboard = await buildDashboardFromLocalCache();

  const emptyPersonalAnalytics = localAnalyticsEngine.computeAnalytics(emptyDashboard, 'personal');
  assert.equal(emptyPersonalAnalytics.categorySlices.length, 0);
  assert.equal(emptyPersonalAnalytics.sixMonthTrend.length, 6);
  assert.equal(emptyPersonalAnalytics.weeklyRhythm.days.length, 7);
  assert.equal(emptyPersonalAnalytics.monthComparison.pct, 0);

  // Populated data
  const populatedDashboard = {
    ...emptyDashboard,
    personalTotal: 5000,
    unifiedTotal: 5500,
    personalExpenses: [
      {
        id: 'p-1',
        user_id: 'u-1',
        amount: 3000,
        category: 'food',
        expense_date: '2026-10-15',
        created_at: '2026-10-15T00:00:00Z',
        updated_at: '2026-10-15T00:00:00Z',
      },
      {
        id: 'p-2',
        user_id: 'u-1',
        amount: 2000,
        category: 'transport',
        expense_date: '2026-10-14',
        created_at: '2026-10-14T00:00:00Z',
        updated_at: '2026-10-14T00:00:00Z',
      },
    ],
    groupUserSplits: [
      {
        id: 'split-1',
        group_id: 'grp-1',
        expense_id: 'ge-1',
        user_id: 'u-1',
        amount: 500,
        category: 'housing',
        expense_date: '2026-10-10',
        group_name: 'Flatmates',
      },
    ],
  };

  const allAnalytics = localAnalyticsEngine.computeAnalytics(populatedDashboard, 'all');
  assert.ok(allAnalytics.categorySlices.length > 0);
  assert.equal(allAnalytics.weeklyRhythm.days.length, 7);
  assert.equal(typeof allAnalytics.monthComparison.trend, 'string');
});

// -----------------------------------------------------------------------------
// Scenario 9: Non-retryable 4xx error dropped after 3 retries
// -----------------------------------------------------------------------------
test('Scenario 9: Server 4xx rejection dropped after 3 retries to prevent blocking', async () => {
  await outboxService.clear();
  networkService.setSimulatedOnline(false);

  await outboxService.enqueue('create_personal_expense', {
    amount: -100, // Invalid payload rejected by backend
    category: 'unknown',
  });

  const originalPost = apiClient.post;
  apiClient.post = async () => {
    throw new Error('400 Bad Request: Amount must be positive');
  };

  try {
    // Attempt 1: retryCount becomes 1, stays in queue
    networkService.setSimulatedOnline(true);
    await outboxService.waitForSync();

    assert.equal(outboxService.getQueue().length, 1);
    assert.equal(outboxService.getQueue()[0].retryCount, 1);

    // Attempt 2: retryCount becomes 2, stays in queue
    await outboxService.processQueue();
    assert.equal(outboxService.getQueue().length, 1);
    assert.equal(outboxService.getQueue()[0].retryCount, 2);

    // Attempt 3: retryCount reaches 3 -> dropped to prevent permanently wedged queue
    await outboxService.processQueue();
    assert.equal(outboxService.getQueue().length, 0);
  } finally {
    apiClient.post = originalPost;
  }
});

// -----------------------------------------------------------------------------
// Scenario 10: Cache hygiene, cleanupExpiredEntries, and trimExpensesCache
// -----------------------------------------------------------------------------
test('Scenario 10: Cache hygiene purges expired keys and prunes large collections', async () => {
  // 1. cleanupExpiredEntries
  await cacheService.set('cache:active_1', { data: 1 }, 10000);
  await cacheService.set('cache:active_2', { data: 2 }, 10000);
  await cacheService.set('cache:expired_1', { data: 3 }, -100);
  await cacheService.set('cache:expired_2', { data: 4 }, -100);

  const removedExpired = await cacheService.cleanupExpiredEntries();
  assert.equal(removedExpired, 2);
  assert.notEqual(await cacheService.get('cache:active_1'), null);
  assert.equal(await cacheService.get('cache:expired_1'), null);

  // 2. trimExpensesCache
  const mockExpenses = Array.from({ length: 10 }, (_, i) => ({
    id: `exp-${i}`,
    amount: 100 + i,
    expense_date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  }));

  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, mockExpenses);

  // Trim to max 4 items
  const removedCount = await cacheService.trimExpensesCache(4);
  assert.equal(removedCount, 6);

  const trimmed = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(trimmed?.length, 4);
  // Retains most recent: exp-9, exp-8, exp-7, exp-6
  assert.equal(trimmed?.[0].id, 'exp-9');

  // 3. getStorageMetrics
  const metrics = await cacheService.getStorageMetrics();
  assert.ok(metrics.totalKeys >= 3);
  assert.ok(metrics.cacheKeysCount >= 3);
  assert.ok(metrics.estimatedBytes > 0);
});

// -----------------------------------------------------------------------------
// Scenario 11: Temp ID collision resilience
// -----------------------------------------------------------------------------
test('Scenario 11: Rapid generation of 1,000 temp IDs yields zero collisions', () => {
  const ids = new Set<string>();
  const totalToGenerate = 1000;

  for (let i = 0; i < totalToGenerate; i++) {
    const id = outboxService.generateTempId('temp-exp');
    assert.ok(isOfflineId(id), `Expected ${id} to pass isOfflineId`);
    ids.add(id);
  }

  assert.equal(ids.size, totalToGenerate, 'All 1,000 temp IDs must be globally unique');
});
