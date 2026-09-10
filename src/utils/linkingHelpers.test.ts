import { test } from 'node:test';
import assert from 'node:assert';
import { parseDeepLink } from './linkingHelpers';

test('parseDeepLink resolves group join deep links', () => {
  const parsedSplitTrack = parseDeepLink('splittrack://join/test-group-id-123');
  assert.ok(parsedSplitTrack);
  assert.strictEqual(parsedSplitTrack!.route, 'JoinGroupModal');
  assert.strictEqual(parsedSplitTrack!.params.groupId, 'test-group-id-123');

  const parsedTabsy = parseDeepLink('tabsy://join/test-group-id-123');
  assert.ok(parsedTabsy);
  assert.strictEqual(parsedTabsy!.route, 'JoinGroupModal');
  assert.strictEqual(parsedTabsy!.params.groupId, 'test-group-id-123');
});

test('parseDeepLink resolves group detail and monthly settlement deep links', () => {
  const groupLink = parseDeepLink('splittrack://groups/grp-456');
  assert.ok(groupLink);
  assert.strictEqual(groupLink!.route, 'GroupDetail');
  assert.strictEqual(groupLink!.params.groupId, 'grp-456');

  const settlementLink = parseDeepLink('splittrack://groups/grp-456/settlements/9/2026');
  assert.ok(settlementLink);
  assert.strictEqual(settlementLink!.route, 'MonthlySettlementDetail');
  assert.strictEqual(settlementLink!.params.groupId, 'grp-456');
  assert.strictEqual(settlementLink!.params.month, '9');
  assert.strictEqual(settlementLink!.params.year, '2026');
});

test('parseDeepLink resolves friend detail links', () => {
  const parsed = parseDeepLink('splittrack://friends/user-friend-999');
  assert.ok(parsed);
  assert.strictEqual(parsed!.route, 'FriendDetail');
  assert.strictEqual(parsed!.params.friendId, 'user-friend-999');
});

test('parseDeepLink resolves standard shortcuts', () => {
  const addExp = parseDeepLink('splittrack://add-expense');
  assert.ok(addExp);
  assert.strictEqual(addExp!.route, 'AddExpenseModal');

  const prof = parseDeepLink('splittrack://profile');
  assert.ok(prof);
  assert.strictEqual(prof!.route, 'Profile');

  const sett = parseDeepLink('splittrack://settings');
  assert.ok(sett);
  assert.strictEqual(sett!.route, 'Settings');
});

test('parseDeepLink returns null for invalid or empty URLs', () => {
  assert.strictEqual(parseDeepLink(''), null);
  assert.strictEqual(parseDeepLink('splittrack://unknown-route/123/456'), null);
});
