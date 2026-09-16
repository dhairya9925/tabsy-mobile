import { test } from 'node:test';
import assert from 'node:assert';
import { filterFriends, filterGroups } from './friendSearch';
import { FriendRecord, Group } from '../types';

test('filterFriends should return all friends when query is empty', () => {
  const friends: FriendRecord[] = [
    {
      id: 'f1',
      user_id: 'u1',
      friend_id: 'u2',
      status: 'accepted',
      created_at: '',
      updated_at: '',
      profile: { user_id: 'u2', display_name: 'Vikram Patel', email: 'vikram@example.com', is_shadow: false },
    },
    {
      id: 'f2',
      user_id: 'u1',
      friend_id: 'u3',
      status: 'accepted',
      created_at: '',
      updated_at: '',
      profile: { user_id: 'u3', display_name: 'Ananya Sharma', email: 'ananya@example.com', is_shadow: false },
    },
  ];

  assert.strictEqual(filterFriends(friends, '').length, 2);
  assert.strictEqual(filterFriends(friends, '   ').length, 2);
});

test('filterFriends should filter case-insensitively by name and email', () => {
  const friends: FriendRecord[] = [
    {
      id: 'f1',
      user_id: 'u1',
      friend_id: 'u2',
      status: 'accepted',
      created_at: '',
      updated_at: '',
      profile: { user_id: 'u2', display_name: 'Vikram Patel', email: 'vikram@example.com', is_shadow: false },
    },
    {
      id: 'f2',
      user_id: 'u1',
      friend_id: 'u3',
      status: 'accepted',
      created_at: '',
      updated_at: '',
      profile: { user_id: 'u3', display_name: 'Ananya Sharma', email: 'ananya@example.com', is_shadow: false },
    },
    {
      id: 'f3',
      user_id: 'u1',
      friend_id: 'u4',
      status: 'accepted',
      created_at: '',
      updated_at: '',
      profile: { user_id: 'u4', display_name: null, email: 'zack.dev@gmail.com', is_shadow: false },
    },
  ];

  const res1 = filterFriends(friends, 'vik');
  assert.strictEqual(res1.length, 1);
  assert.strictEqual(res1[0].id, 'f1');

  const res2 = filterFriends(friends, 'SHARMA');
  assert.strictEqual(res2.length, 1);
  assert.strictEqual(res2[0].id, 'f2');

  const res3 = filterFriends(friends, 'zack');
  assert.strictEqual(res3.length, 1);
  assert.strictEqual(res3[0].id, 'f3');

  const resEmpty = filterFriends(friends, 'nonexistent');
  assert.strictEqual(resEmpty.length, 0);
});

test('filterGroups should filter by name or description', () => {
  const groups: Group[] = [
    { id: 'g1', name: 'Goa Trip 2026', created_by: 'u1', created_at: '', updated_at: '', type: 'trip', description: 'Sun and beaches' },
    { id: 'g2', name: 'Flat 402 Roommates', created_by: 'u1', created_at: '', updated_at: '', type: 'shared_living', description: 'Rent and bills' },
  ];

  assert.strictEqual(filterGroups(groups, '').length, 2);
  assert.strictEqual(filterGroups(groups, 'goa').length, 1);
  assert.strictEqual(filterGroups(groups, 'rent').length, 1);
  assert.strictEqual(filterGroups(groups, 'Roommates').length, 1);
  assert.strictEqual(filterGroups(groups, 'nonexistent').length, 0);
});
