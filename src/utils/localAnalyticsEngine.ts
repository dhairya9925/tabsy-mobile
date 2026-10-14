import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import {
  CategorySlice,
  MonthlyTrendPoint,
  WeeklyRhythmDay,
  DashboardData,
} from '../types';
import {
  computeCategoryBreakdown,
  computeSixMonthTrend,
  computeWeeklyRhythm,
  computeMonthComparison,
} from './analyticsCalculations';

export interface ComputedAnalytics {
  categorySlices: CategorySlice[];
  categoryTotal: number;
  sixMonthTrend: MonthlyTrendPoint[];
  weeklyRhythm: {
    days: WeeklyRhythmDay[];
    daysLogged: number;
    maxDayAmount: number;
    weekTotal: number;
  };
  monthComparison: {
    pct: number;
    trend: 'less' | 'more' | 'same';
    label: string;
  };
  timestamp: number;
}

export const localAnalyticsEngine = {
  /**
   * Computes all analytical models from DashboardData for a given view mode ('all' | 'personal').
   */
  computeAnalytics(
    data: DashboardData,
    mode: 'all' | 'personal' = 'all'
  ): ComputedAnalytics {
    const personalExpenses = data.personalExpenses || [];
    const groupUserSplits = data.groupUserSplits || [];

    const { slices: categorySlices, total: categoryTotal } = computeCategoryBreakdown(
      personalExpenses,
      groupUserSplits,
      mode
    );

    const sixMonthTrend = computeSixMonthTrend(personalExpenses, groupUserSplits);
    const weeklyRhythm = computeWeeklyRhythm(personalExpenses);

    const currentTotal = mode === 'all' ? (data.unifiedTotal || 0) : (data.personalTotal || 0);
    const prevTotal = mode === 'all' ? (data.unifiedPrevMonthTotal || 0) : (data.personalPrevMonthTotal || 0);
    const monthComparison = computeMonthComparison(currentTotal, prevTotal);

    return {
      categorySlices,
      categoryTotal,
      sixMonthTrend,
      weeklyRhythm,
      monthComparison,
      timestamp: Date.now(),
    };
  },

  /**
   * Retrieves cached computed analytics if available and valid.
   */
  async getCachedAnalytics(mode: 'all' | 'personal' = 'all'): Promise<ComputedAnalytics | null> {
    return await cacheService.get<ComputedAnalytics>(CACHE_KEYS.COMPUTED_ANALYTICS(mode));
  },

  /**
   * Computes analytics from data and caches the result for 30 minutes.
   */
  async computeAndCache(
    data: DashboardData,
    mode: 'all' | 'personal' = 'all'
  ): Promise<ComputedAnalytics> {
    const computed = this.computeAnalytics(data, mode);
    await cacheService.set(
      CACHE_KEYS.COMPUTED_ANALYTICS(mode),
      computed,
      30 * 60 * 1000 // 30 min TTL
    );
    return computed;
  },
};
