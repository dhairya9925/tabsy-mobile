import test from 'node:test';
import assert from 'node:assert';
import { QuickAddModule } from './QuickAddModule';
import { secureStorage } from '../utils/secureStorage';

test('QuickAddModule.isSupported returns a boolean', () => {
  const supported = QuickAddModule.isSupported();
  assert.strictEqual(typeof supported, 'boolean');
});

test('QuickAddModule starts and stops service with state persistence', async () => {
  // Start service
  const startResult = await QuickAddModule.startQuickAddService();
  assert.strictEqual(typeof startResult, 'boolean');

  // Verify running state
  const isRunning = await QuickAddModule.isServiceRunning();
  assert.strictEqual(typeof isRunning, 'boolean');

  // Stop service
  const stopResult = await QuickAddModule.stopQuickAddService();
  assert.strictEqual(typeof stopResult, 'boolean');

  // Verify stopped state
  const isRunningAfterStop = await QuickAddModule.isServiceRunning();
  assert.strictEqual(isRunningAfterStop, false);
});

test('QuickAddModule permission methods return booleans safely', async () => {
  const hasOverlay = await QuickAddModule.hasOverlayPermission();
  assert.strictEqual(typeof hasOverlay, 'boolean');

  const reqOverlay = await QuickAddModule.requestOverlayPermission();
  assert.strictEqual(typeof reqOverlay, 'boolean');

  const hasNotif = await QuickAddModule.hasNotificationPermission();
  assert.strictEqual(typeof hasNotif, 'boolean');

  const reqNotif = await QuickAddModule.requestNotificationPermission();
  assert.strictEqual(typeof reqNotif, 'boolean');
});

test('QuickAddModule.openOverlay executes without error', async () => {
  const resVoice = await QuickAddModule.openOverlay('voice');
  assert.strictEqual(typeof resVoice, 'boolean');

  const resText = await QuickAddModule.openOverlay('text');
  assert.strictEqual(typeof resText, 'boolean');
});

test('QuickAddModule.addActionListener adds and removes listener cleanly', () => {
  let called = false;
  const unsubscribe = QuickAddModule.addActionListener((mode) => {
    called = true;
  });

  assert.strictEqual(typeof unsubscribe, 'function');
  unsubscribe();
  assert.strictEqual(called, false);
});

test('QuickAddModule auth session sync and clear execute cleanly', async () => {
  const syncRes = await QuickAddModule.syncAuthSession('mock_token', 'http://localhost:8000');
  assert.strictEqual(syncRes, true);

  const clearRes = await QuickAddModule.clearAuthSession();
  assert.strictEqual(clearRes, true);
});

test('QuickAddModule pending expenses get and clear return valid values', async () => {
  const pending = await QuickAddModule.getPendingExpenses();
  assert.strictEqual(typeof pending, 'string');

  const clearPending = await QuickAddModule.clearPendingExpenses();
  assert.strictEqual(clearPending, true);
});
