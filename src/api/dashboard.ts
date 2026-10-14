import { apiClient } from './client';
import { DashboardData } from '../types';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { networkService } from '../services/offline/networkService';
import { buildDashboardFromLocalCache } from '../utils/localDashboardBuilder';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardData> => {
    // 1. Try reading cached dashboard data first
    const cached =
      (await cacheService.get<DashboardData>(CACHE_KEYS.INSIGHT_DASHBOARD_DATA)) ||
      (await cacheService.get<DashboardData>(CACHE_KEYS.DASHBOARD_SUMMARY));

    // 2. If offline, return cache or compute from local data
    if (!networkService.isOnline()) {
      if (cached) return cached;
      return await buildDashboardFromLocalCache();
    }

    // 3. If online, fetch fresh data
    try {
      const res: any = await apiClient.get('/api/v1/dashboard/summary');
      if (res && typeof res === 'object') {
        await cacheService.set(CACHE_KEYS.INSIGHT_DASHBOARD_DATA, res);
        await cacheService.set(CACHE_KEYS.DASHBOARD_SUMMARY, res);
      }
      return res;
    } catch (err) {
      // Network failed — return cached data or compute from local cache
      if (cached) return cached;
      return await buildDashboardFromLocalCache();
    }
  },
};
