import test from 'node:test';
import assert from 'node:assert';
import { useAuthStore } from './useAuthStore';
import { UserProfile } from '../types';

test('useAuthStore should initialize with unauthenticated state', () => {
  const state = useAuthStore.getState();
  assert.strictEqual(state.isAuthenticated, false);
  assert.strictEqual(state.token, null);
  assert.strictEqual(state.user, null);
});

test('useAuthStore setUser should update user profile', () => {
  const mockUser: UserProfile = {
    id: 'user-123',
    user_id: 'user-123',
    display_name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    is_shadow: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  useAuthStore.getState().setUser(mockUser);
  assert.deepStrictEqual(useAuthStore.getState().user, mockUser);
});

test('useAuthStore logout should clear state', async () => {
  await useAuthStore.getState().logout();
  const state = useAuthStore.getState();
  assert.strictEqual(state.isAuthenticated, false);
  assert.strictEqual(state.token, null);
  assert.strictEqual(state.user, null);
});
