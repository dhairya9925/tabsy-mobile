import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from './storage';
import { cacheService, CACHE_KEYS } from './cacheService';
import { outboxService, isOfflineId } from './outboxService';
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

test('expensesApi: offline update and delete for server item', async () => {
  networkService.setSimulatedOnline(false);

  const existingExpense = {
    id: 'exp-server-1',
    user_id: 'u-1',
    amount: 500,
    category: 'Food',
    expense_date: '2026-10-10',
    date: '2026-10-10',
    description: 'Dinner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_pending_sync: false,
  };
  await cacheService.set(CACHE_KEYS.PERSONAL_EXPENSES, [existingExpense]);

  // 1. Update while offline
  const updated = await expensesApi.updatePersonalExpense('exp-server-1', {
    amount: 650,
    note: 'Dinner with drinks',
  });

  assert.equal(updated.amount, 650);
  assert.equal(updated.is_pending_sync, true);

  // Check outbox has update_personal_expense
  const queue1 = outboxService.getQueue();
  assert.equal(queue1.length, 1);
  assert.equal(queue1[0].type, 'update_personal_expense');
  assert.equal(queue1[0].payload.expenseId, 'exp-server-1');
  assert.equal(queue1[0].payload.payload.amount, 650);

  // Check cache was updated
  const cachedAfterUpdate = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cachedAfterUpdate?.[0]?.amount, 650);

  // 2. Delete while offline
  await expensesApi.deletePersonalExpense('exp-server-1');

  // Pending update should be discarded and replaced with delete
  const queue2 = outboxService.getQueue();
  assert.equal(queue2.length, 1);
  assert.equal(queue2[0].type, 'delete_personal_expense');
  assert.equal(queue2[0].payload.expenseId, 'exp-server-1');

  // Cache should have item removed
  const cachedAfterDelete = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cachedAfterDelete?.length, 0);
});

test('expensesApi: offline edit and delete of pending created item cancels outbox without server delete', async () => {
  networkService.setSimulatedOnline(false);

  // 1. Create offline
  const created = await expensesApi.createPersonalExpense({
    amount: 150,
    category: 'coffee',
    note: 'Morning espresso',
    expense_date: '2026-10-15',
  });
  assert.ok(created.id.startsWith('temp-exp-'));
  assert.equal(outboxService.getQueue().length, 1);
  assert.equal(outboxService.getQueue()[0].type, 'create_personal_expense');

  // 2. Edit while still offline -> should merge into pending create
  const edited = await expensesApi.updatePersonalExpense(created.id, {
    amount: 180,
    note: 'Double espresso',
  });
  assert.equal(edited.amount, 180);

  // Outbox should still only have 1 item (the creation), with updated payload
  const queueAfterEdit = outboxService.getQueue();
  assert.equal(queueAfterEdit.length, 1);
  assert.equal(queueAfterEdit[0].type, 'create_personal_expense');
  assert.equal(queueAfterEdit[0].payload.amount, 180);

  // 3. Delete while still offline -> should completely remove from outbox (never sent to server)
  await expensesApi.deletePersonalExpense(created.id);
  assert.equal(outboxService.getQueue().length, 0);

  const cached = await cacheService.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
  assert.equal(cached?.length, 0);
});

test('friendsApi: offline update, delete, and payment operations', async () => {
  networkService.setSimulatedOnline(false);

  // 1. Create friend expense offline
  const created = await friendsApi.createFriendExpense('fr-99', {
    amount: 1200,
    category: 'Dinner',
    note: 'Pizza night',
    expense_date: '2026-10-12',
    paid_by: 'me',
    split_type: 'equal',
  });
  assert.ok(created.id.startsWith('temp-frd-exp-'));

  const cachedFeed1 = await friendsApi.getFriendExpenses('fr-99');
  assert.equal(cachedFeed1.length, 1);
  assert.equal(cachedFeed1[0].amount, 1200);

  // 2. Update friend expense offline
  const updated = await friendsApi.updateFriendExpense('fr-99', created.id, {
    amount: 1400,
  });
  assert.equal(updated.amount, 1400);

  // 3. Record payment offline
  const pmt = await friendsApi.recordFriendPayment('fr-99', 700, 'friend-user-1');
  assert.ok(pmt.id.startsWith('temp-frd-pmt-'));
  assert.equal(pmt.amount, 700);

  const cachedFeed2 = await friendsApi.getFriendExpenses('fr-99');
  assert.equal(cachedFeed2.length, 2);

  // 4. Delete friend expense offline
  await friendsApi.deleteFriendExpense('fr-99', created.id);
  const cachedFeed3 = await friendsApi.getFriendExpenses('fr-99');
  assert.equal(cachedFeed3.length, 1);
  assert.equal(cachedFeed3[0].id, pmt.id);
});

test('groupsApi: offline update and delete operations', async () => {
  networkService.setSimulatedOnline(false);

  // 1. Create group expense offline
  const created = await groupsApi.createGroupExpense('grp-55', {
    amount: 3000,
    category: 'Groceries',
    note: 'Weekly essentials',
    expense_date: '2026-10-14',
    paid_by: 'user-self',
    splits: [
      { user_id: 'user-self', amount: 1500 },
      { user_id: 'user-other', amount: 1500 },
    ],
  });
  assert.ok(created.id.startsWith('temp-grp-exp-'));

  const cachedExpenses1 = await groupsApi.getGroupExpenses('grp-55');
  assert.equal(cachedExpenses1.length, 1);
  assert.equal(cachedExpenses1[0].amount, 3000);

  // 2. Update group expense offline
  const updated = await groupsApi.updateGroupExpense('grp-55', created.id, {
    amount: 3500,
  });
  assert.equal(updated.amount, 3500);

  const cachedExpenses2 = await groupsApi.getGroupExpenses('grp-55');
  assert.equal(cachedExpenses2[0].amount, 3500);

  // 3. Delete group expense offline
  await groupsApi.deleteGroupExpense('grp-55', created.id);
  const cachedExpenses3 = await groupsApi.getGroupExpenses('grp-55');
  assert.equal(cachedExpenses3.length, 0);
  assert.equal(outboxService.getQueue().length, 0); // Temporary creation removed from outbox
});

test('categoriesApi: offline create, update, and delete operations', async () => {
  networkService.setSimulatedOnline(false);

  // Initial categories
  await cacheService.set(CACHE_KEYS.CATEGORIES, [
    { id: 'cat-orig', name: 'Original', is_default: true },
  ]);

  // 1. Create category offline
  const created = await categoriesApi.createCategory({ name: 'Hobbies' });
  assert.ok(created.id.startsWith('temp-cat-'));

  const cachedCats1 = await categoriesApi.getCategories();
  assert.equal(cachedCats1.length, 2);
  assert.equal(cachedCats1[1].name, 'Hobbies');

  // 2. Update category offline
  const updated = await categoriesApi.updateCategory(created.id, { name: 'Gaming & Hobbies' });
  assert.equal(updated.name, 'Gaming & Hobbies');

  const cachedCats2 = await categoriesApi.getCategories();
  assert.equal(cachedCats2[1].name, 'Gaming & Hobbies');

  // 3. Delete category offline
  await categoriesApi.deleteCategory(created.id);
  const cachedCats3 = await categoriesApi.getCategories();
  assert.equal(cachedCats3.length, 1);
  assert.equal(cachedCats3[0].id, 'cat-orig');
  assert.equal(outboxService.getQueue().length, 0);
});

test('isOfflineId correctly distinguishes offline temp IDs from server IDs', () => {
  assert.equal(isOfflineId('temp-exp-12345'), true);
  assert.equal(isOfflineId('temp-cat-67890'), true);
  assert.equal(isOfflineId('offline-123'), true);
  assert.equal(isOfflineId('local-456'), true);
  assert.equal(isOfflineId('srv-12345'), false);
  assert.equal(isOfflineId('e10'), false);
  assert.equal(isOfflineId('550e8400-e29b-41d4-a716-446655440000'), false);
  assert.equal(isOfflineId(null), false);
  assert.equal(isOfflineId(undefined), false);
});

test('outboxService.getTargetEntityId correctly extracts entity IDs for all action types', () => {
  assert.equal(
    outboxService.getTargetEntityId({
      id: 'a1',
      type: 'create_personal_expense',
      tempId: 'temp-exp-1',
      payload: { id: 'temp-exp-1', amount: 100 },
      createdAt: 1,
      retryCount: 0,
    }),
    'temp-exp-1'
  );

  assert.equal(
    outboxService.getTargetEntityId({
      id: 'a2',
      type: 'update_personal_expense',
      payload: { expenseId: 'srv-exp-2', payload: { amount: 200 } },
      createdAt: 2,
      retryCount: 0,
    }),
    'srv-exp-2'
  );

  assert.equal(
    outboxService.getTargetEntityId({
      id: 'a3',
      type: 'delete_personal_expense',
      payload: { expenseId: 'srv-exp-3' },
      createdAt: 3,
      retryCount: 0,
    }),
    'srv-exp-3'
  );

  assert.equal(
    outboxService.getTargetEntityId({
      id: 'a4',
      type: 'update_group_expense',
      payload: { groupId: 'grp-1', expenseId: 'srv-exp-4', payload: { amount: 300 } },
      createdAt: 4,
      retryCount: 0,
    }),
    'srv-exp-4'
  );

  assert.equal(
    outboxService.getTargetEntityId({
      id: 'a5',
      type: 'delete_category',
      payload: { categoryId: 'cat-5' },
      createdAt: 5,
      retryCount: 0,
    }),
    'cat-5'
  );
});

test('deduplicateQueue Rule 1: temporary create + delete cancels out completely', async () => {
  networkService.setSimulatedOnline(false);

  const tempId = 'temp-exp-cancel-1';
  await outboxService.enqueue('create_personal_expense', {
    id: tempId,
    amount: 100,
    category: 'food',
    note: 'Temp snack',
  }, tempId);

  assert.equal(outboxService.getPendingCount(), 1);

  // Enqueue delete for that temporary entity
  await outboxService.enqueue('delete_personal_expense', {
    expenseId: tempId,
  });

  // Both the create and the delete should be automatically purged by deduplicateQueue
  assert.equal(outboxService.getPendingCount(), 0);
  assert.equal(outboxService.getQueue().length, 0);
});

test('deduplicateQueue Rule 1b: standalone delete of temporary ID is purged', async () => {
  networkService.setSimulatedOnline(false);

  // Directly enqueue a delete for a temp ID that has no prior create
  await outboxService.enqueue('delete_personal_expense', {
    expenseId: 'temp-exp-orphan-99',
  });

  // Temporary delete alone is discarded because server has no record of temporary ID
  assert.equal(outboxService.getPendingCount(), 0);
});

test('deduplicateQueue Rule 2: server entity updates followed by delete discards updates', async () => {
  networkService.setSimulatedOnline(false);

  const srvId = 'srv-exp-100';

  // 1. First update to amount
  await outboxService.enqueue('update_personal_expense', {
    expenseId: srvId,
    payload: { amount: 150 },
  });

  // 2. Second update to note
  await outboxService.enqueue('update_personal_expense', {
    expenseId: srvId,
    payload: { note: 'Revised note' },
  });

  // 3. User deletes the expense
  await outboxService.enqueue('delete_personal_expense', {
    expenseId: srvId,
  });

  const queue = outboxService.getQueue();
  // The obsolete updates should be discarded, keeping only the final delete action
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'delete_personal_expense');
  assert.equal(queue[0].payload.expenseId, srvId);
});

test('deduplicateQueue Rule 3: multiple updates for same server entity are consolidated', async () => {
  networkService.setSimulatedOnline(false);

  const srvId = 'srv-exp-200';

  // 1. Update amount
  await outboxService.enqueue('update_personal_expense', {
    expenseId: srvId,
    payload: { amount: 100 },
  });

  // 2. Update note
  await outboxService.enqueue('update_personal_expense', {
    expenseId: srvId,
    payload: { note: 'Groceries' },
  });

  // 3. Update category & amount again
  await outboxService.enqueue('update_personal_expense', {
    expenseId: srvId,
    payload: { category: 'groceries', amount: 125 },
  });

  const queue = outboxService.getQueue();
  // 3 updates should be consolidated into 1 single update
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'update_personal_expense');
  assert.equal(queue[0].payload.expenseId, srvId);
  assert.deepEqual(queue[0].payload.payload, {
    amount: 125,
    note: 'Groceries',
    category: 'groceries',
  });
});

test('deduplicateQueue Rule 4: temporary create followed by update merges update into create', async () => {
  networkService.setSimulatedOnline(false);

  const tempId = 'temp-exp-merge-1';

  // 1. Create personal expense offline
  await outboxService.enqueue('create_personal_expense', {
    id: tempId,
    amount: 200,
    category: 'food',
    note: 'Lunch',
    expense_date: '2026-10-15',
  }, tempId);

  // 2. User modifies the expense offline before syncing
  await outboxService.enqueue('update_personal_expense', {
    expenseId: tempId,
    payload: { amount: 260, note: 'Lunch with team' },
  });

  const queue = outboxService.getQueue();
  // Should have only 1 create action with merged values
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'create_personal_expense');
  assert.equal(queue[0].tempId, tempId);
  assert.equal(queue[0].payload.amount, 260);
  assert.equal(queue[0].payload.note, 'Lunch with team');
  assert.equal(queue[0].payload.category, 'food');
  assert.equal(queue[0].payload.expense_date, '2026-10-15');
});

test('deduplicateQueue: multi-entity complex queue compaction preserves relative ordering', async () => {
  networkService.setSimulatedOnline(false);

  const tempA = 'temp-exp-A';
  const srvB = 'srv-exp-B';
  const tempC = 'temp-exp-C';
  const srvD = 'srv-exp-D';

  await outboxService.enqueue('create_personal_expense', { id: tempA, amount: 50 }, tempA);
  await outboxService.enqueue('update_personal_expense', { expenseId: srvB, payload: { amount: 100 } });
  await outboxService.enqueue('create_personal_expense', { id: tempC, amount: 200, note: 'Initial' }, tempC);
  await outboxService.enqueue('update_personal_expense', { expenseId: srvD, payload: { note: 'Will be deleted' } });
  await outboxService.enqueue('update_personal_expense', { expenseId: srvB, payload: { note: 'Dinner' } });
  await outboxService.enqueue('update_personal_expense', { expenseId: tempC, payload: { note: 'Updated note' } });
  await outboxService.enqueue('delete_personal_expense', { expenseId: tempA });
  await outboxService.enqueue('delete_personal_expense', { expenseId: srvD });

  const queue = outboxService.getQueue();

  // Exactly 3 actions should remain:
  // 1. srvB: Consolidated update (amount: 100, note: 'Dinner')
  // 2. tempC: Merged create (amount: 200, note: 'Updated note')
  // 3. srvD: Delete
  assert.equal(queue.length, 3);

  // First action: srvB update
  assert.equal(queue[0].type, 'update_personal_expense');
  assert.equal(queue[0].payload.expenseId, srvB);
  assert.deepEqual(queue[0].payload.payload, { amount: 100, note: 'Dinner' });

  // Second action: tempC create with merged note
  assert.equal(queue[1].type, 'create_personal_expense');
  assert.equal(queue[1].tempId, tempC);
  assert.equal(queue[1].payload.amount, 200);
  assert.equal(queue[1].payload.note, 'Updated note');

  // Third action: srvD delete
  assert.equal(queue[2].type, 'delete_personal_expense');
  assert.equal(queue[2].payload.expenseId, srvD);
});




