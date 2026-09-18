import { test } from 'node:test';
import assert from 'node:assert';
import { parseDeepLink } from './linkingHelpers';

test('parseDeepLink resolves group join deep links', () => {
  const parsedTabsy = parseDeepLink('tabsy://join/test-group-id-123');
  assert.ok(parsedTabsy);
  assert.strictEqual(parsedTabsy!.route, 'JoinGroupModal');
  assert.strictEqual(parsedTabsy!.params.groupId, 'test-group-id-123');
});

test('parseDeepLink resolves group detail and monthly settlement deep links', () => {
  const groupLink = parseDeepLink('tabsy://groups/grp-456');
  assert.ok(groupLink);
  assert.strictEqual(groupLink!.route, 'GroupDetail');
  assert.strictEqual(groupLink!.params.groupId, 'grp-456');

  const settlementLink = parseDeepLink('tabsy://groups/grp-456/settlements/9/2026');
  assert.ok(settlementLink);
  assert.strictEqual(settlementLink!.route, 'MonthlySettlementDetail');
  assert.strictEqual(settlementLink!.params.groupId, 'grp-456');
  assert.strictEqual(settlementLink!.params.month, '9');
  assert.strictEqual(settlementLink!.params.year, '2026');
});

test('parseDeepLink resolves friend detail links', () => {
  const parsed = parseDeepLink('tabsy://friends/user-friend-999');
  assert.ok(parsed);
  assert.strictEqual(parsed!.route, 'FriendDetail');
  assert.strictEqual(parsed!.params.friendId, 'user-friend-999');
});

test('parseDeepLink resolves standard shortcuts', () => {
  const addExp = parseDeepLink('tabsy://add-expense');
  assert.ok(addExp);
  assert.strictEqual(addExp!.route, 'AddExpenseModal');

  const prof = parseDeepLink('tabsy://profile');
  assert.ok(prof);
  assert.strictEqual(prof!.route, 'Profile');

  const sett = parseDeepLink('tabsy://settings');
  assert.ok(sett);
  assert.strictEqual(sett!.route, 'Settings');

  const cats = parseDeepLink('tabsy://categories');
  assert.ok(cats);
  assert.strictEqual(cats!.route, 'CategoryManager');
});

test('parseDeepLink returns null for invalid or empty URLs', () => {
  assert.strictEqual(parseDeepLink(''), null);
  assert.strictEqual(parseDeepLink('tabsy://unknown-route/123/456'), null);
  assert.strictEqual(parseDeepLink('otherapp://join/test-group-id-123'), null);
});
