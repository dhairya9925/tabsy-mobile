import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from './storage';
import { cacheService, CACHE_KEYS } from './cacheService';
import { networkService } from './networkService';
import { preloadService, preloadOfflineData } from './preloadService';
import { secureStorage } from '../../utils/secureStorage';
import { apiClient } from '../../api/client';

beforeEach(async () => {
  await appStorage.clear();
  preloadService.reset();
  networkService.setSimulatedOnline(true);
});

test('preloadService: skips execution when network is offline', async () => {
  networkService.setSimulatedOnline(false);
  await secureStorage.setAuthToken('test-token');

  const result = await preloadOfflineData();
  assert.equal(result.success, false);
  assert.equal(result.skipped, true);
  assert.equal(result.loaded.length, 0);
});

test('preloadService: skips execution when unauthenticated', async () => {
  networkService.setSimulatedOnline(true);
  await secureStorage.clearAll();

  const result = await preloadOfflineData();
  assert.equal(result.success, false);
  assert.equal(result.skipped, true);
});

test('preloadService: executes and populates cache when online and authenticated', async () => {
  networkService.setSimulatedOnline(true);
  await secureStorage.setAuthToken('test-token');
  await secureStorage.setCachedUser({
    id: 'user-preload-1',
    user_id: 'user-preload-1',
    display_name: 'Preload Tester',
    email: 'preload@example.com',
    avatar_url: null,
    is_shadow: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Mock API endpoints to simulate successful responses
  const originalGet = apiClient.get;
  apiClient.get = (async (url: string) => {
    if (url.includes('/api/v1/expenses/personal')) {
      return [{ id: 'p1', amount: 150, category: 'food', expense_date: '2026-10-15' }];
    }
    if (url.includes('/api/v1/categories/')) {
      return [{ id: 'c1', name: 'Food', is_default: true }];
    }
    if (url.includes('/api/v1/expenses/dashboard/summary')) {
      return { total_spent: 150, category_totals: { food: 150 } };
    }
    if (url.includes('/api/v1/friends/?status=accepted')) {
      return [{ id: 'f1', user_id: 'user-preload-1', friend_id: 'f-user-2', status: 'accepted' }];
    }
    if (url.includes('/api/v1/friends/balances')) {
      return [{ friend_id: 'f-user-2', balance: 50 }];
    }
    if (url.includes('/api/v1/friends/?status=pending')) {
      return [];
    }
    if (url.includes('/api/v1/friends/?status=sent')) {
      return [];
    }
    if (url.includes('/api/v1/groups/')) {
      return [{ id: 'g1', name: 'Flatmates', group_type: 'shared_living' }];
    }
    if (url.includes('/api/v1/dashboard/summary')) {
      return {
        personalTotal: 150,
        personalPrevMonthTotal: 100,
        personalExpenseCount: 1,
        personalExpenses: [{ id: 'p1', amount: 150, category: 'food', expense_date: '2026-10-15' }],
        groups: [{ id: 'g1', name: 'Flatmates', group_type: 'shared_living' }],
        groupShareTotal: 0,
        groupSharePrevMonthTotal: 0,
        groupUserSplits: [],
        unifiedTotal: 150,
        unifiedPrevMonthTotal: 100,
      };
    }
    return [];
  }) as any;

  try {
    const result = await preloadOfflineData({ force: true });
    assert.equal(result.success, true);
    assert.ok(result.loaded.includes('personal_expenses'));
    assert.ok(result.loaded.includes('categories'));
    assert.ok(result.loaded.includes('friends'));
    assert.ok(result.loaded.includes('groups'));
    assert.ok(result.loaded.includes('dashboard_data'));

    // Verify data was stored in local cache
    const cachedExpenses = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
    assert.ok(Array.isArray(cachedExpenses));
    assert.equal(cachedExpenses?.length, 1);
    assert.equal(cachedExpenses?.[0].amount, 150);

    const cachedCats = await cacheService.get<any[]>(CACHE_KEYS.CATEGORIES);
    assert.ok(Array.isArray(cachedCats));
    assert.equal(cachedCats?.length, 1);
    assert.equal(cachedCats?.[0].name, 'Food');

    const cachedFriends = await cacheService.get<any[]>(CACHE_KEYS.FRIENDS_LIST);
    assert.ok(Array.isArray(cachedFriends));
    assert.equal(cachedFriends?.length, 1);

    const cachedGroups = await cacheService.get<any[]>(CACHE_KEYS.GROUPS_LIST);
    assert.ok(Array.isArray(cachedGroups));
    assert.equal(cachedGroups?.length, 1);
  } finally {
    apiClient.get = originalGet;
  }
});

test('preloadService: respects cooldown unless force is true', async () => {
  networkService.setSimulatedOnline(true);
  await secureStorage.setAuthToken('test-token');

  const originalGet = apiClient.get;
  apiClient.get = (async () => []) as any;

  try {
    // 1. Initial call with force
    const r1 = await preloadOfflineData({ force: true });
    assert.equal(r1.success, true);
    assert.equal(r1.skipped, undefined);

    // 2. Immediate second call without force should be skipped due to cooldown
    const r2 = await preloadOfflineData();
    assert.equal(r2.success, true);
    assert.equal(r2.skipped, true);

    // 3. Third call with force should execute
    const r3 = await preloadOfflineData({ force: true });
    assert.equal(r3.success, true);
    assert.equal(r3.skipped, undefined);
  } finally {
    apiClient.get = originalGet;
  }
});

test('preloadService: reset clears timestamp allowing immediate reload', async () => {
  networkService.setSimulatedOnline(true);
  await secureStorage.setAuthToken('test-token');

  const originalGet = apiClient.get;
  apiClient.get = (async () => []) as any;

  try {
    await preloadOfflineData({ force: true });
    preloadService.reset();
    assert.equal(preloadService.getLastPreloadTime(), 0);

    // After reset, calling without force should proceed
    const r = await preloadOfflineData();
    assert.equal(r.success, true);
    assert.equal(r.skipped, undefined);
  } finally {
    apiClient.get = originalGet;
  }
});

test('preloadService: gracefully handles endpoint failures with Promise.allSettled', async () => {
  networkService.setSimulatedOnline(true);
  await secureStorage.setAuthToken('test-token');

  const originalGet = apiClient.get;
  apiClient.get = (async (url: string) => {
    if (url.includes('/api/v1/expenses/personal')) {
      throw new Error('500 Internal Server Error');
    }
    if (url.includes('/api/v1/categories/')) {
      return [{ id: 'c1', name: 'Food' }];
    }
    return [];
  }) as any;

  try {
    const result = await preloadOfflineData({ force: true });
    // Still succeeds overall because other endpoints completed
    assert.equal(result.success, true);
    assert.ok(result.loaded.includes('categories'));
    assert.ok(!result.loaded.includes('personal_expenses'));
  } finally {
    apiClient.get = originalGet;
  }
});
