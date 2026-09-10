import { test } from 'node:test';
import assert from 'node:assert';
import { getGroupTypeMeta, GROUP_TYPES } from './groupTypes';

test('getGroupTypeMeta should return correct meta for shared_living', () => {
  const meta = getGroupTypeMeta('shared_living');
  assert.strictEqual(meta.id, 'shared_living');
  assert.strictEqual(meta.label, 'Shared Living');
  assert.ok(meta.suggestedCategories.includes('bills'));
});

test('getGroupTypeMeta should return correct meta for trip', () => {
  const meta = getGroupTypeMeta('trip');
  assert.strictEqual(meta.id, 'trip');
  assert.strictEqual(meta.label, 'Trip');
  assert.ok(meta.suggestedCategories.includes('transport'));
});

test('getGroupTypeMeta should fallback to day_to_day when undefined or unknown', () => {
  const fallbackUndefined = getGroupTypeMeta(undefined);
  assert.strictEqual(fallbackUndefined.id, 'day_to_day');

  const fallbackNull = getGroupTypeMeta(null);
  assert.strictEqual(fallbackNull.id, 'day_to_day');

  const fallbackUnknown = getGroupTypeMeta('unknown_type');
  assert.strictEqual(fallbackUnknown.id, 'day_to_day');
});
