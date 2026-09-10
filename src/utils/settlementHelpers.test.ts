import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateSettlementProgress,
  isFinalizeWindowOpen,
  getSettlementStatusMeta,
  getMonthName,
} from './settlementHelpers';

test('calculateSettlementProgress computes percentage and allCompleted state', () => {
  const zero = calculateSettlementProgress(0, 0);
  assert.strictEqual(zero.percentage, 0);
  assert.strictEqual(zero.isAllCompleted, false);

  const partial = calculateSettlementProgress(4, 3);
  assert.strictEqual(partial.completedCount, 3);
  assert.strictEqual(partial.totalMembers, 4);
  assert.strictEqual(partial.percentage, 75);
  assert.strictEqual(partial.isAllCompleted, false);

  const full = calculateSettlementProgress(4, 4);
  assert.strictEqual(full.percentage, 100);
  assert.strictEqual(full.isAllCompleted, true);

  const overflow = calculateSettlementProgress(4, 5);
  assert.strictEqual(overflow.completedCount, 4);
  assert.strictEqual(overflow.percentage, 100);
  assert.strictEqual(overflow.isAllCompleted, true);
});

test('isFinalizeWindowOpen evaluates date boundaries', () => {
  // For August 2026 (month 8):
  // Last day of month is Aug 31, 2026
  // Window ends Sept 7, 2026 23:59:59

  const beforeWindow = new Date('2026-08-20T12:00:00Z');
  assert.strictEqual(isFinalizeWindowOpen(8, 2026, beforeWindow), false);

  const duringWindow1 = new Date('2026-08-31T15:00:00Z');
  assert.strictEqual(isFinalizeWindowOpen(8, 2026, duringWindow1), true);

  const duringWindow2 = new Date('2026-09-03T10:00:00Z');
  assert.strictEqual(isFinalizeWindowOpen(8, 2026, duringWindow2), true);

  const afterWindow = new Date('2026-09-10T12:00:00Z');
  assert.strictEqual(isFinalizeWindowOpen(8, 2026, afterWindow), false);
});

test('getSettlementStatusMeta resolves labels and colors', () => {
  const open = getSettlementStatusMeta('open');
  assert.strictEqual(open.label, 'Open');

  const locked = getSettlementStatusMeta('locked');
  assert.strictEqual(locked.label, 'Locked');

  const finalized = getSettlementStatusMeta('finalized');
  assert.strictEqual(finalized.label, 'Finalized');
});

test('getMonthName returns correct English month name', () => {
  assert.strictEqual(getMonthName(1), 'January');
  assert.strictEqual(getMonthName(9), 'September');
  assert.strictEqual(getMonthName(12), 'December');
  assert.strictEqual(getMonthName(0), 'Unknown');
});
