import { appStorage } from './storage';
import { CacheEntry } from '../../types';

// Default Cache TTL: 7 days (in milliseconds)
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const CACHE_KEYS = {
  PERSONAL_EXPENSES: 'cache:personal_expenses',
  GROUPS_LIST: 'cache:groups_list',
  GROUP_BALANCES: 'cache:group_balances',
  GROUP_MEMBER_COUNTS: 'cache:group_member_counts',
  FRIENDS_LIST: 'cache:friends_list',
  FRIEND_BALANCES: 'cache:friend_balances',
  CATEGORIES: 'cache:categories',
  DASHBOARD_SUMMARY: 'cache:dashboard_summary',
  INSIGHT_DASHBOARD_DATA: 'cache:insight_dashboard_data',
  PENDING_FRIEND_REQUESTS: 'cache:pending_friend_requests',
  SENT_FRIEND_REQUESTS: 'cache:sent_friend_requests',
  FRIEND_PROFILE: (friendId: string) => `cache:friend_profile:${friendId}`,
  FRIEND_EXPENSES: (friendId: string) => `cache:friend_expenses:${friendId}`,
  GROUP_DETAIL: (groupId: string) => `cache:group_detail:${groupId}`,
  GROUP_MEMBERS: (groupId: string) => `cache:group_members:${groupId}`,
  GROUP_EXPENSES: (groupId: string) => `cache:group_expenses:${groupId}`,
  GROUP_SETTLEMENT_RECORDS: (groupId: string) => `cache:group_settlement_records:${groupId}`,
  GROUP_SETTLEMENT: (groupId: string, month: number, year: number) =>
    `cache:group_settlement:${groupId}:${year}-${String(month).padStart(2, '0')}`,
  MONTHLY_LEDGER: (groupId: string, year: number, month: number) =>
    `cache:monthly_ledger:${groupId}:${year}-${String(month).padStart(2, '0')}`,
  STREAK_DATES: 'cache:streak_dates',
  USER_PROFILE: 'cache:user_profile',
  COMPUTED_ANALYTICS: (mode: string) => `cache:computed_analytics:${mode}`,
};

export const cacheService = {
  /**
   * Retrieves data from the local cache. Returns null if missing or expired.
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const entry = await appStorage.getItem<CacheEntry<T>>(key);
      if (!entry) return null;

      const ttl = entry.ttl ?? DEFAULT_TTL_MS;
      const isExpired = Date.now() - entry.timestamp > ttl;

      if (isExpired) {
        // Asynchronously remove expired item
        appStorage.removeItem(key).catch(() => {});
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  /**
   * Writes data to the local cache with a timestamp and optional TTL.
   */
  async set<T = any>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      };
      await appStorage.setItem(key, entry);
    } catch (err) {
      console.warn(`[cacheService] Failed to cache "${key}":`, err);
    }
  },

  /**
   * Invalidates a specific cache key.
   */
  async invalidate(key: string): Promise<void> {
    await appStorage.removeItem(key);
  },

  /**
   * Invalidates all cache entries starting with a specific prefix.
   */
  async invalidatePattern(prefix: string): Promise<void> {
    try {
      const allKeys = await appStorage.getAllKeys();
      const matched = allKeys.filter((k) => k.startsWith(prefix));
      await Promise.all(matched.map((k) => appStorage.removeItem(k)));
    } catch (err) {
      console.warn(`[cacheService] Failed to invalidate pattern "${prefix}":`, err);
    }
  },

  /**
   * Scans all cached keys, checks timestamps against TTL, and purges expired entries.
   * Returns the count of removed entries.
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const allKeys = await appStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith('cache:'));
      let removedCount = 0;

      for (const key of cacheKeys) {
        const entry = await appStorage.getItem<CacheEntry<any>>(key);
        if (!entry) continue;

        const ttl = entry.ttl ?? DEFAULT_TTL_MS;
        const isExpired = Date.now() - entry.timestamp > ttl;
        if (isExpired) {
          await appStorage.removeItem(key);
          removedCount++;
        }
      }

      return removedCount;
    } catch (err) {
      console.warn('[cacheService] cleanupExpiredEntries failed:', err);
      return 0;
    }
  },

  /**
   * Returns estimated storage metrics (key count, cache keys count, approximate size in bytes).
   */
  async getStorageMetrics(): Promise<{
    totalKeys: number;
    cacheKeysCount: number;
    estimatedBytes: number;
  }> {
    try {
      const allKeys = await appStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith('cache:'));
      let estimatedBytes = 0;

      for (const key of allKeys) {
        const item = await appStorage.getItem(key);
        if (item) {
          estimatedBytes += key.length * 2 + JSON.stringify(item).length * 2;
        }
      }

      return {
        totalKeys: allKeys.length,
        cacheKeysCount: cacheKeys.length,
        estimatedBytes,
      };
    } catch {
      return { totalKeys: 0, cacheKeysCount: 0, estimatedBytes: 0 };
    }
  },

  /**
   * Trims cached personal expenses to at most maxItems (most recent first)
   * to prevent exceeding device storage limits on large accounts.
   */
  async trimExpensesCache(maxItems: number = 500): Promise<number> {
    try {
      const expenses = await this.get<any[]>(CACHE_KEYS.PERSONAL_EXPENSES);
      if (!Array.isArray(expenses) || expenses.length <= maxItems) {
        return 0;
      }

      const sorted = [...expenses].sort((a, b) => {
        const dateA = new Date(a.expense_date || a.created_at || 0).getTime();
        const dateB = new Date(b.expense_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const trimmed = sorted.slice(0, maxItems);
      const removed = expenses.length - trimmed.length;
      await this.set(CACHE_KEYS.PERSONAL_EXPENSES, trimmed);
      return removed;
    } catch {
      return 0;
    }
  },
};
