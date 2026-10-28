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

test('useAuthStore logout with skipServerLogout should clear local session and caches without error', async () => {
  useAuthStore.setState({
    token: 'active-mock-token',
    isAuthenticated: true,
    user: {
      id: 'usr-123',
      user_id: 'usr-123',
      display_name: 'Logged-in User',
      email: 'user@example.com',
      avatar_url: null,
      is_shadow: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  assert.strictEqual(useAuthStore.getState().isAuthenticated, true);
  await useAuthStore.getState().logout({ skipServerLogout: true });

  const state = useAuthStore.getState();
  assert.strictEqual(state.isAuthenticated, false);
  assert.strictEqual(state.token, null);
  assert.strictEqual(state.user, null);
});
