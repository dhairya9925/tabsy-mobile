/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert';
import {
  AVATAR_KEYS,
  resolveAvatar,
  avatarKeyToUrl,
  extractAvatarKey,
} from './avatarRegistry';

test('avatarRegistry has 15 avatars', () => {
  assert.strictEqual(AVATAR_KEYS.length, 15);
  for (let i = 1; i <= 15; i++) {
    assert.ok(AVATAR_KEYS.includes(`avatar-${i}`));
    assert.ok(resolveAvatar(`avatar-${i}`) !== null);
  }
});

test('avatarKeyToUrl converts key to canonical URL and preserves full URLs', () => {
  assert.strictEqual(avatarKeyToUrl(null), null);
  assert.strictEqual(avatarKeyToUrl(undefined), null);
  assert.strictEqual(avatarKeyToUrl('avatar-1'), 'https://avatar.tabsy.app/avatar-1');
  assert.strictEqual(avatarKeyToUrl('avatar-15'), 'https://avatar.tabsy.app/avatar-15');
  assert.strictEqual(avatarKeyToUrl('https://example.com/avatar.png'), 'https://example.com/avatar.png');
});

test('extractAvatarKey extracts avatar key from bare keys and URLs', () => {
  assert.strictEqual(extractAvatarKey(null), null);
  assert.strictEqual(extractAvatarKey(''), null);
  assert.strictEqual(extractAvatarKey('avatar-3'), 'avatar-3');
  assert.strictEqual(extractAvatarKey('https://avatar.tabsy.app/avatar-3'), 'avatar-3');
  assert.strictEqual(extractAvatarKey('https://example.com/images/avatar-12.png'), 'avatar-12');
  assert.strictEqual(extractAvatarKey('unknown-key'), null);
  assert.strictEqual(extractAvatarKey('avatar-99'), null);
});

test('resolveAvatar resolves both bare keys and canonical URLs', () => {
  assert.ok(resolveAvatar('avatar-1') !== null);
  assert.ok(resolveAvatar('https://avatar.tabsy.app/avatar-1') !== null);
  assert.ok(resolveAvatar('https://avatar.tabsy.app/avatar-15') !== null);
});

test('resolveAvatar returns null for unknown avatar or null', () => {
  assert.strictEqual(resolveAvatar(null), null);
  assert.strictEqual(resolveAvatar(undefined), null);
  assert.strictEqual(resolveAvatar(''), null);
  assert.strictEqual(resolveAvatar('unknown-avatar'), null);
  assert.strictEqual(resolveAvatar('https://example.com/random-photo.png'), null);
});
