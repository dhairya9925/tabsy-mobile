import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStorage } from '../services/offline/storage';
import { localAnalyticsEngine } from './localAnalyticsEngine';
import { DashboardData } from '../types';

beforeEach(async () => {
  await appStorage.clear();
});

test('localAnalyticsEngine.computeAnalytics computes complete models for personal mode', () => {
  const mockData: Partial<DashboardData> = {
    personalTotal: 2500,
    personalPrevMonthTotal: 2000,
    personalExpenses: [
      {
        id: 'pe-1',
        amount: 1500,
        category: 'Food',
        expense_date: new Date().toISOString().slice(0, 10),
        user_id: 'u1',
        description: 'Lunch',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'pe-2',
        amount: 1000,
        category: 'Transit',
        expense_date: new Date().toISOString().slice(0, 10),
        user_id: 'u1',
        description: 'Cab',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    groupUserSplits: [],
  };

  const analytics = localAnalyticsEngine.computeAnalytics(mockData as DashboardData, 'personal');

  assert.equal(analytics.categoryTotal, 2500);
  assert.equal(analytics.categorySlices.length, 2);
  assert.equal(analytics.categorySlices[0].categoryId, 'food');
  assert.equal(analytics.categorySlices[0].value, 1500);
  assert.equal(analytics.sixMonthTrend.length, 6);
  assert.equal(analytics.weeklyRhythm.days.length, 7);
  assert.equal(analytics.monthComparison.trend, 'more');
  assert.equal(analytics.monthComparison.pct, 25);
});

test('localAnalyticsEngine.computeAnalytics includes groupUserSplits in all mode', () => {
  const today = new Date().toISOString().slice(0, 10);
  const mockData: Partial<DashboardData> = {
    personalTotal: 1000,
    groupShareTotal: 800,
    unifiedTotal: 1800,
    unifiedPrevMonthTotal: 1200,
    personalExpenses: [
      {
        id: 'pe-1',
        amount: 1000,
        category: 'Food',
        expense_date: today,
        user_id: 'u1',
        description: 'Lunch',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    groupUserSplits: [
      {
        id: 'split-1',
        group_id: 'grp-1',
        amount: 800,
        category: 'Utilities',
        expense_date: today,
      },
    ],
  };

  const analytics = localAnalyticsEngine.computeAnalytics(mockData as DashboardData, 'all');

  assert.equal(analytics.categoryTotal, 1800);
  assert.equal(analytics.categorySlices.length, 2);
  assert.equal(analytics.categorySlices.find((s) => s.categoryId === 'utilities')?.value, 800);
  assert.equal(analytics.monthComparison.trend, 'more');
  assert.equal(analytics.monthComparison.pct, 50); // (1800-1200)/1200 = 50%
});

test('localAnalyticsEngine.computeAndCache and getCachedAnalytics store and retrieve results', async () => {
  const mockData: Partial<DashboardData> = {
    personalTotal: 500,
    personalExpenses: [],
    groupUserSplits: [],
  };

  const cachedBefore = await localAnalyticsEngine.getCachedAnalytics('personal');
  assert.equal(cachedBefore, null);

  await localAnalyticsEngine.computeAndCache(mockData as DashboardData, 'personal');

  const cachedAfter = await localAnalyticsEngine.getCachedAnalytics('personal');
  assert.ok(cachedAfter);
  assert.equal(cachedAfter?.categoryTotal, 0);
  assert.equal(cachedAfter?.weeklyRhythm.days.length, 7);
});
