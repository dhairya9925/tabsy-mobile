import test from 'node:test';
import assert from 'node:assert';
import { analytics } from './analytics';

test('analytics.track records events accurately with timestamp', () => {
  analytics.clearEvents();
  assert.strictEqual(analytics.getRecentEvents().length, 0);

  analytics.track('ai_recording_started');
  analytics.track('ai_expense_parsed', {
    type: 'personal',
    confidence: 0.95,
  });

  const events = analytics.getRecentEvents();
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[0].event, 'ai_recording_started');
  assert.strictEqual(events[1].event, 'ai_expense_parsed');
  assert.strictEqual(events[1].payload?.type, 'personal');
  assert.strictEqual(events[1].payload?.confidence, 0.95);
  assert.strictEqual(typeof events[0].timestamp, 'number');
});

test('analytics.clearEvents empties the log', () => {
  analytics.track('ai_fallback_triggered', { source: 'error_banner' });
  assert.strictEqual(analytics.getRecentEvents().length > 0, true);

  analytics.clearEvents();
  assert.strictEqual(analytics.getRecentEvents().length, 0);
});
