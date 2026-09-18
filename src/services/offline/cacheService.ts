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
  MONTHLY_LEDGER: (groupId: string, year: number, month: number) =>
    `cache:monthly_ledger:${groupId}:${year}-${String(month).padStart(2, '0')}`,
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
};
