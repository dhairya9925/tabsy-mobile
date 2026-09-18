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
