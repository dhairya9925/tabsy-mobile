import { expensesApi } from '../../api/expenses';
import { friendsApi } from '../../api/friends';
import { groupsApi } from '../../api/groups';
import { dashboardApi } from '../../api/dashboard';
import { networkService } from './networkService';
import { cacheService, CACHE_KEYS } from './cacheService';
import { localAnalyticsEngine } from '../../utils/localAnalyticsEngine';
import { secureStorage } from '../../utils/secureStorage';

export interface PreloadOptions {
  force?: boolean;
}

export interface PreloadResult {
  success: boolean;
  timestamp: number;
  loaded: string[];
  skipped?: boolean;
  errors?: string[];
}

export class PreloadService {
  private isPreloading: boolean = false;
  private lastPreloadTimestamp: number = 0;
  private minIntervalMs: number = 45 * 1000; // 45 seconds cooldown

  constructor() {
    // Automatically trigger cache refresh when connectivity is restored
    let prevOnline = networkService.isOnline();
    networkService.subscribe((isOnline) => {
      if (isOnline && !prevOnline) {
        this.preloadAll().catch(() => {});
      }
      prevOnline = isOnline;
    });
  }

  /**
   * Preloads all critical data collections into local storage caches.
   * Runs non-blockingly and gracefully handles network offline state.
   */
  public async preloadAll(options: PreloadOptions = {}): Promise<PreloadResult> {
    // Skip if already in-flight
    if (this.isPreloading) {
      return { success: false, timestamp: Date.now(), loaded: [], skipped: true };
    }

    // Skip if offline
    if (!networkService.isOnline()) {
      return { success: false, timestamp: Date.now(), loaded: [], skipped: true };
    }

    // Check cooldown unless forced
    const now = Date.now();
    if (!options.force && now - this.lastPreloadTimestamp < this.minIntervalMs) {
      return { success: true, timestamp: this.lastPreloadTimestamp, loaded: [], skipped: true };
    }

    // Verify authentication
    try {
      const token = await secureStorage.getAuthToken();
      if (!token) {
        return { success: false, timestamp: now, loaded: [], skipped: true };
      }
    } catch {
      return { success: false, timestamp: now, loaded: [], skipped: true };
    }

    this.isPreloading = true;
    const loaded: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Primary independent collections in parallel
      const [
        personalExpensesRes,
        categoriesRes,
        dashSummaryRes,
        streakDatesRes,
        friendsRes,
        friendBalancesRes,
        pendingReqsRes,
        sentReqsRes,
        groupsRes,
        dashboardDataRes,
      ] = await Promise.allSettled([
        expensesApi.getPersonalExpenses(),
        expensesApi.getCategories(),
        expensesApi.getDashboardSummary(),
        expensesApi.getStreakActivityDates(),
        friendsApi.getFriends(),
        friendsApi.getFriendBalances(),
        friendsApi.getPendingRequests(),
        friendsApi.getSentRequests(),
        groupsApi.getGroups(),
        dashboardApi.getSummary(),
      ]);

      if (personalExpensesRes.status === 'fulfilled') loaded.push('personal_expenses');
      if (categoriesRes.status === 'fulfilled') loaded.push('categories');
      if (dashSummaryRes.status === 'fulfilled') loaded.push('dashboard_summary');
      if (streakDatesRes.status === 'fulfilled') loaded.push('streak_dates');
      if (friendsRes.status === 'fulfilled') loaded.push('friends');
      if (friendBalancesRes.status === 'fulfilled') loaded.push('friend_balances');
      if (pendingReqsRes.status === 'fulfilled') loaded.push('pending_requests');
      if (sentReqsRes.status === 'fulfilled') loaded.push('sent_requests');
      if (groupsRes.status === 'fulfilled') loaded.push('groups');
      if (dashboardDataRes.status === 'fulfilled') loaded.push('dashboard_data');

      // 2. Sub-entity preloading for groups (members, expenses, balances)
      if (groupsRes.status === 'fulfilled' && Array.isArray(groupsRes.value)) {
        const groups = groupsRes.value.slice(0, 10);
        const groupBalancesMap: Record<string, number> = {};
        const groupMemberCountsMap: Record<string, number> = {};

        const cachedUser = await secureStorage.getCachedUser().catch(() => null);
        const currId = cachedUser?.id;

        await Promise.allSettled(
          groups.map(async (g) => {
            const [bList, mList] = await Promise.all([
              groupsApi.getGroupBalances(g.id).catch(() => []),
              groupsApi.getGroupMembers(g.id).catch(() => []),
              groupsApi.getGroupExpenses(g.id).catch(() => []),
            ]);

            groupMemberCountsMap[g.id] = mList.length;

            if (currId && Array.isArray(bList)) {
              let net = 0;
              bList.forEach((b: any) => {
                if (b.to_user_id === currId) net += b.amount;
                if (b.from_user_id === currId) net -= b.amount;
              });
              groupBalancesMap[g.id] = net;
            }
          })
        );

        if (Object.keys(groupBalancesMap).length > 0) {
          await cacheService.set(CACHE_KEYS.GROUP_BALANCES, groupBalancesMap);
        }
        if (Object.keys(groupMemberCountsMap).length > 0) {
          await cacheService.set(CACHE_KEYS.GROUP_MEMBER_COUNTS, groupMemberCountsMap);
        }
        loaded.push('group_details');
      }

      // 3. Sub-entity preloading for friends (individual feeds)
      if (friendsRes.status === 'fulfilled' && Array.isArray(friendsRes.value)) {
        const friends = friendsRes.value.slice(0, 10);
        await Promise.allSettled(
          friends.map((f: any) => {
            const targetId = f.friend_id || f.id;
            return friendsApi.getFriendExpenses(targetId).catch(() => []);
          })
        );
        loaded.push('friend_expenses');
      }

      // 4. Precompute and cache analytics models for instantaneous rendering
      if (dashboardDataRes.status === 'fulfilled' && dashboardDataRes.value) {
        try {
          await Promise.allSettled([
            localAnalyticsEngine.computeAndCache(dashboardDataRes.value, 'all'),
            localAnalyticsEngine.computeAndCache(dashboardDataRes.value, 'personal'),
          ]);
          loaded.push('computed_analytics');
        } catch {
          // Non-fatal analytics precompute error
        }
      }

      // Level 4: Cache Maintenance & Eviction (purges expired keys, prunes large lists)
      try {
        await cacheService.cleanupExpiredEntries();
        await cacheService.trimExpensesCache(500);
      } catch {
        // Non-fatal cache hygiene error
      }

      this.lastPreloadTimestamp = Date.now();
      return {
        success: true,
        timestamp: this.lastPreloadTimestamp,
        loaded,
        errors,
      };
    } catch (err: any) {
      errors.push(err.message || 'Preload error');
      return {
        success: false,
        timestamp: Date.now(),
        loaded,
        errors,
      };
    } finally {
      this.isPreloading = false;
    }
  }

  public isPreloadingActive(): boolean {
    return this.isPreloading;
  }

  public getLastPreloadTime(): number {
    return this.lastPreloadTimestamp;
  }

  /**
   * Resets timestamp and state (e.g. for testing or on logout).
   */
  public reset(): void {
    this.lastPreloadTimestamp = 0;
    this.isPreloading = false;
  }
}

export const preloadService = new PreloadService();

export async function preloadOfflineData(options?: PreloadOptions): Promise<PreloadResult> {
  return preloadService.preloadAll(options);
}
