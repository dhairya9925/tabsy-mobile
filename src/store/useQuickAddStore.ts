import { create } from 'zustand';
import { QuickAddModule } from '../native/QuickAddModule';
import { secureStorage } from '../utils/secureStorage';

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
}));
