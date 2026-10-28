import { test } from 'node:test';
import assert from 'node:assert';
import { resolveApiBaseUrl } from './client';

test('resolveApiBaseUrl prioritizes EXPO_PUBLIC_API_URL when provided', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;
  try {
    process.env.EXPO_PUBLIC_API_URL = 'https://65.1.93.155.sslip.io';
    assert.strictEqual(resolveApiBaseUrl(), 'https://65.1.93.155.sslip.io');

    // Handles quoted strings in .env
    process.env.EXPO_PUBLIC_API_URL = '"https://65.1.93.155.sslip.io"';
    assert.strictEqual(resolveApiBaseUrl(), 'https://65.1.93.155.sslip.io');

    process.env.EXPO_PUBLIC_API_URL = "'https://custom-api.example.com'";
    assert.strictEqual(resolveApiBaseUrl(), 'https://custom-api.example.com');
  } finally {
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
  }
});

test('resolveApiBaseUrl falls back to local dev or production when EXPO_PUBLIC_API_URL is unset', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;
  try {
    delete process.env.EXPO_PUBLIC_API_URL;
    const url = resolveApiBaseUrl();
    assert.ok(url.startsWith('http://') || url.startsWith('https://'));
  } finally {
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
  }
});

test('isPublicAuthEndpoint accurately categorizes public vs protected routes', async () => {
  const { isPublicAuthEndpoint } = await import('./client');
  assert.strictEqual(isPublicAuthEndpoint('/api/v1/auth/login'), true);
  assert.strictEqual(isPublicAuthEndpoint('/api/v1/auth/signup'), true);
  assert.strictEqual(isPublicAuthEndpoint('/api/v1/auth/logout'), false);
  assert.strictEqual(isPublicAuthEndpoint('/api/v1/users/me'), false);
  assert.strictEqual(isPublicAuthEndpoint('/api/v1/expenses/personal'), false);
  assert.strictEqual(isPublicAuthEndpoint(undefined), false);
});

test('isExcludedFromAutoLogout excludes login, signup, and logout from 401 auto-logout', async () => {
  const { isExcludedFromAutoLogout } = await import('./client');
  assert.strictEqual(isExcludedFromAutoLogout('/api/v1/auth/login'), true);
  assert.strictEqual(isExcludedFromAutoLogout('/api/v1/auth/signup'), true);
  assert.strictEqual(isExcludedFromAutoLogout('/api/v1/auth/logout'), true);
  assert.strictEqual(isExcludedFromAutoLogout('/api/v1/users/me'), false);
  assert.strictEqual(isExcludedFromAutoLogout('/api/v1/groups/123/balances'), false);
  assert.strictEqual(isExcludedFromAutoLogout(undefined), false);
});

test('triggerAutoLogout clears secureStorage and invokes unauthorizedHandler', async () => {
  const { triggerAutoLogout, setUnauthorizedHandler } = await import('./client');
  const { secureStorage } = await import('../utils/secureStorage');

  await secureStorage.setAuthToken('temp-test-token');
  let handlerCalled = false;
  setUnauthorizedHandler(async () => {
    handlerCalled = true;
  });

  await triggerAutoLogout();

  assert.strictEqual(handlerCalled, true);
  const token = await secureStorage.getAuthToken();
  assert.strictEqual(token, null);
});

test('missing authorization token rejects protected requests and triggers auto-logout', async () => {
  const { apiClient, setUnauthorizedHandler } = await import('./client');
  const { secureStorage } = await import('../utils/secureStorage');

  // Ensure no token is present
  await secureStorage.clearAll();

  let autoLogoutFired = false;
  setUnauthorizedHandler(async () => {
    autoLogoutFired = true;
  });

  await assert.rejects(
    async () => {
      await apiClient.get('/api/v1/expenses/personal');
    },
    (err: Error) => {
      assert.strictEqual(err.message, 'Missing authorization token (bearer)');
      return true;
    }
  );

  assert.strictEqual(autoLogoutFired, true);
});
