import test from 'node:test';
import assert from 'node:assert';
import { useQuickAddStore, QUICK_ADD_ENABLED_KEY } from './useQuickAddStore';
import { secureStorage } from '../utils/secureStorage';

test('useQuickAddStore initial state and permission check', async () => {
  await useQuickAddStore.getState().init();
  const state = useQuickAddStore.getState();

  assert.strictEqual(typeof state.isEnabled, 'boolean');
  assert.strictEqual(typeof state.hasOverlayPermission, 'boolean');
  assert.strictEqual(typeof state.hasNotificationPermission, 'boolean');
});

test('useQuickAddStore toggleService enables and disables service', async () => {
  // 1. Enable service
  const enableRes = await useQuickAddStore.getState().toggleService(true);
  let state = useQuickAddStore.getState();

  assert.strictEqual(state.isEnabled, true);
  const storedEnabled = await secureStorage.getItem(QUICK_ADD_ENABLED_KEY);
  assert.strictEqual(storedEnabled, 'true');

  // 2. Disable service
  const disableRes = await useQuickAddStore.getState().toggleService(false);
  state = useQuickAddStore.getState();

  assert.strictEqual(state.isEnabled, false);
  assert.strictEqual(state.isServiceRunning, false);
  const storedDisabled = await secureStorage.getItem(QUICK_ADD_ENABLED_KEY);
  assert.strictEqual(storedDisabled, 'false');
});

test('useQuickAddStore requestOverlayPermission and requestNotificationPermission', async () => {
  const overlayRes = await useQuickAddStore.getState().requestOverlayPermission();
  assert.strictEqual(typeof overlayRes, 'boolean');

  const notifRes = await useQuickAddStore.getState().requestNotificationPermission();
  assert.strictEqual(typeof notifRes, 'boolean');
});

test('useQuickAddStore openOverlay executes without error', async () => {
  const res = await useQuickAddStore.getState().openOverlay('text');
  assert.strictEqual(typeof res, 'boolean');
});
