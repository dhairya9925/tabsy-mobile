import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from './storage';
import { cacheService, CACHE_KEYS } from './cacheService';
import { outboxService } from './outboxService';
import { networkService } from './networkService';

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
