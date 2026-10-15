import { create } from 'zustand';
import { QuickAddModule, QuickAddGroupItem, QuickAddFriendItem } from '../native/QuickAddModule';
import { secureStorage } from '../utils/secureStorage';
import { resolveApiBaseUrl } from '../api/client';
import { expensesApi } from '../api/expenses';
import { groupsApi } from '../api/groups';
import { friendsApi } from '../api/friends';
import { useAuthStore } from './useAuthStore';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';

export const QUICK_ADD_ENABLED_KEY = 'tabsy_quick_add_enabled';

export interface QuickAddState {
  isEnabled: boolean;
  isServiceRunning: boolean;
  hasOverlayPermission: boolean;
  hasNotificationPermission: boolean;
  isCheckingPermissions: boolean;
  error: string | null;

  init: () => Promise<void>;
  toggleService: (enabled: boolean) => Promise<boolean>;
  checkPermissions: () => Promise<void>;
  requestOverlayPermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  openOverlay: (mode?: 'voice' | 'text') => Promise<boolean>;
  flushPendingExpenses: () => Promise<void>;
  syncUserData: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useQuickAddStore = create<QuickAddState>((set, get) => ({
  isEnabled: false,
  isServiceRunning: false,
  hasOverlayPermission: false,
  hasNotificationPermission: true,
  isCheckingPermissions: false,
  error: null,

  setError: (error) => set({ error }),

  init: async () => {
    try {
      set({ isCheckingPermissions: true });

      // Read persisted toggle preference
      const storedPref = await secureStorage.getItem(QUICK_ADD_ENABLED_KEY);
      const isEnabled = storedPref === 'true';

      // Check current native permissions & service running state
      const [overlayPerm, notifPerm, serviceRunning] = await Promise.all([
        QuickAddModule.hasOverlayPermission(),
        QuickAddModule.hasNotificationPermission(),
        QuickAddModule.isServiceRunning(),
      ]);

      set({
        isEnabled,
        isServiceRunning: serviceRunning || (isEnabled && QuickAddModule.isSupported()),
        hasOverlayPermission: overlayPerm,
        hasNotificationPermission: notifPerm,
        isCheckingPermissions: false,
      });

      // Auto-flush pending offline expenses
      await get().flushPendingExpenses();

      // Sync latest user auth, groups, and friends to native preferences
      await get().syncUserData();

      // If user had enabled it previously and service isn't running, start it
      if (isEnabled && !serviceRunning && QuickAddModule.isSupported()) {
        await QuickAddModule.startQuickAddService();
        set({ isServiceRunning: true });
      }
    } catch (err: any) {
      set({
        isCheckingPermissions: false,
        error: err?.message || 'Failed to initialize Quick Add service',
      });
    }
  },

  checkPermissions: async () => {
    try {
      const [overlayPerm, notifPerm, serviceRunning] = await Promise.all([
        QuickAddModule.hasOverlayPermission(),
        QuickAddModule.hasNotificationPermission(),
        QuickAddModule.isServiceRunning(),
      ]);

      set({
        hasOverlayPermission: overlayPerm,
        hasNotificationPermission: notifPerm,
        isServiceRunning: serviceRunning,
      });
    } catch {
      // Non-blocking
    }
  },

  toggleService: async (enabled: boolean): Promise<boolean> => {
    set({ error: null });

    try {
      if (enabled) {
        await get().syncUserData();

        // Start foreground service
        const started = await QuickAddModule.startQuickAddService();
        await secureStorage.setItem(QUICK_ADD_ENABLED_KEY, 'true');
        set({ isEnabled: true, isServiceRunning: started });
        return started;
      } else {
        // Stop foreground service
        const stopped = await QuickAddModule.stopQuickAddService();
        await secureStorage.setItem(QUICK_ADD_ENABLED_KEY, 'false');
        set({ isEnabled: false, isServiceRunning: false });
        return stopped;
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to toggle Quick Add service';
      set({ error: errMsg });
      return false;
    }
  },

  requestOverlayPermission: async (): Promise<boolean> => {
    try {
      const granted = await QuickAddModule.requestOverlayPermission();
      set({ hasOverlayPermission: granted });
      return granted;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to request overlay permission' });
      return false;
    }
  },

  requestNotificationPermission: async (): Promise<boolean> => {
    try {
      const granted = await QuickAddModule.requestNotificationPermission();
      set({ hasNotificationPermission: granted });
      return granted;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to request notification permission' });
      return false;
    }
  },

  openOverlay: async (mode: 'voice' | 'text' = 'text'): Promise<boolean> => {
    return QuickAddModule.openOverlay(mode);
  },

  syncUserData: async () => {
    try {
      const token = await secureStorage.getAuthToken();
      if (!token) return;

      const user = useAuthStore.getState().user;
      const userId = user?.id || (user as any)?.user_id || '';

      await QuickAddModule.syncAuthSession(token, resolveApiBaseUrl(), userId);

      // Fast sync from local cache first
      const cachedGroups = await cacheService.get<any[]>(CACHE_KEYS.GROUPS_LIST);
      const cachedFriends = await cacheService.get<any[]>(CACHE_KEYS.FRIENDS_LIST);

      if (Array.isArray(cachedGroups)) {
        const formattedGroups: QuickAddGroupItem[] = cachedGroups.map((g) => ({
          id: g.id,
          name: g.name,
        }));
        await QuickAddModule.syncGroups(formattedGroups);
      }

      if (Array.isArray(cachedFriends)) {
        const formattedFriends: QuickAddFriendItem[] = cachedFriends.map((f) => ({
          friend_id: f.friend_id,
          display_name: f.profile?.display_name || f.profile?.email || f.friend_id,
        }));
        await QuickAddModule.syncFriends(formattedFriends);
      }

      // Background fresh fetch from API
      groupsApi
        .getGroups()
        .then((groups) => {
          if (Array.isArray(groups)) {
            const formattedGroups: QuickAddGroupItem[] = groups.map((g) => ({
              id: g.id,
              name: g.name,
            }));
            QuickAddModule.syncGroups(formattedGroups).catch(() => {});
          }
        })
        .catch(() => {});

      friendsApi
        .getFriends()
        .then((friends) => {
          if (Array.isArray(friends)) {
            const formattedFriends: QuickAddFriendItem[] = friends.map((f) => ({
              friend_id: f.friend_id,
              display_name: f.profile?.display_name || f.profile?.email || f.friend_id,
            }));
            QuickAddModule.syncFriends(formattedFriends).catch(() => {});
          }
        })
        .catch(() => {});
    } catch (err) {
      console.warn('[useQuickAddStore] syncUserData error:', err);
    }
  },

  flushPendingExpenses: async () => {
    try {
      const pendingJson = await QuickAddModule.getPendingExpenses();
      if (!pendingJson || pendingJson === '[]') return;

      const items = JSON.parse(pendingJson);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          try {
            await expensesApi.createPersonalExpense({
              amount: Number(item.amount),
              category: item.category || 'General',
              note: item.note || undefined,
              expense_date: item.expense_date,
            });
          } catch (syncErr) {
            console.warn('[useQuickAddStore] Error syncing offline expense:', syncErr);
          }
        }
        await QuickAddModule.clearPendingExpenses();
      }
    } catch (err) {
      console.warn('[useQuickAddStore] flushPendingExpenses error:', err);
    }
  },
}));
