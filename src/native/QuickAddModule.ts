import { secureStorage } from '../utils/secureStorage';

export interface QuickAddThemeConfig {
  paletteId: string;
  isDark: boolean;
  cardBg: string;
  innerCardBg: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
}

export interface QuickAddModuleInterface {
  isSupported(): boolean;
  startQuickAddService(): Promise<boolean>;
  stopQuickAddService(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<boolean>;
  hasNotificationPermission(): Promise<boolean>;
  requestNotificationPermission(): Promise<boolean>;
  openOverlay(mode?: 'voice' | 'text'): Promise<boolean>;
  updateOverlayState(amount: string, category: string): Promise<boolean>;
  dismissOverlay(): Promise<boolean>;
  syncAuthSession(token: string, apiUrl: string): Promise<boolean>;
  clearAuthSession(): Promise<boolean>;
  getPendingExpenses(): Promise<string>;
  clearPendingExpenses(): Promise<boolean>;
  syncTheme(themeConfig: QuickAddThemeConfig): Promise<boolean>;
  syncCategories(categories: { name: string; icon?: string }[]): Promise<boolean>;
  addActionListener(listener: (mode: 'voice' | 'text') => void): () => void;
}

const STORAGE_SERVICE_ENABLED_KEY = 'tabsy_quick_add_service_enabled';

// Safe dynamic access to React Native modules without breaking Node test runners
let RN: any = null;
try {
  RN = require('react-native');
} catch {
  RN = null;
}

// In-memory mock/fallback state for Expo Go, Web, or unit test runners
let mockServiceRunning = false;
let mockOverlayPermission = false;
let mockNotificationPermission = true;

const getNativeModule = () => RN?.NativeModules?.QuickAddModule;

export const QuickAddModule: QuickAddModuleInterface = {
  isSupported(): boolean {
    if (RN?.Platform?.OS) {
      return RN.Platform.OS === 'android';
    }
    // Default to true in non-RN/test environments to allow testing service logic
    return true;
  },

  async startQuickAddService(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.startQuickAddService) {
      try {
        const result = await nativeModule.startQuickAddService();
        await secureStorage.setItem(STORAGE_SERVICE_ENABLED_KEY, 'true');
        return Boolean(result);
      } catch (err) {
        console.warn('[QuickAddModule] Native startQuickAddService failed:', err);
      }
    }

    // Fallback: simulate service running & persist flag
    mockServiceRunning = true;
    await secureStorage.setItem(STORAGE_SERVICE_ENABLED_KEY, 'true');
    RN?.DeviceEventEmitter?.emit?.('quickAddServiceStateChanged', { isRunning: true });
    return true;
  },

  async stopQuickAddService(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.stopQuickAddService) {
      try {
        const result = await nativeModule.stopQuickAddService();
        await secureStorage.setItem(STORAGE_SERVICE_ENABLED_KEY, 'false');
        return Boolean(result);
      } catch (err) {
        console.warn('[QuickAddModule] Native stopQuickAddService failed:', err);
      }
    }

    // Fallback: stop simulated service & persist flag
    mockServiceRunning = false;
    await secureStorage.setItem(STORAGE_SERVICE_ENABLED_KEY, 'false');
    RN?.DeviceEventEmitter?.emit?.('quickAddServiceStateChanged', { isRunning: false });
    return true;
  },

  async isServiceRunning(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.isServiceRunning) {
      try {
        const running = await nativeModule.isServiceRunning();
        return Boolean(running);
      } catch (err) {
        console.warn('[QuickAddModule] Native isServiceRunning check failed:', err);
      }
    }

    // Fallback check against persisted storage flag
    const stored = await secureStorage.getItem(STORAGE_SERVICE_ENABLED_KEY);
    return stored === 'true' || mockServiceRunning;
  },

  async hasOverlayPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.hasOverlayPermission) {
      try {
        return Boolean(await nativeModule.hasOverlayPermission());
      } catch (err) {
        console.warn('[QuickAddModule] hasOverlayPermission check failed:', err);
      }
    }

    return mockOverlayPermission;
  },

  async requestOverlayPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.requestOverlayPermission) {
      try {
        return Boolean(await nativeModule.requestOverlayPermission());
      } catch (err) {
        console.warn('[QuickAddModule] requestOverlayPermission failed:', err);
      }
    }

    // Fallback on Android: open app details settings
    try {
      if (RN?.Linking?.openSettings) {
        await RN.Linking.openSettings();
      }
      mockOverlayPermission = true;
      return true;
    } catch {
      return false;
    }
  },

  async hasNotificationPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.hasNotificationPermission) {
      try {
        return Boolean(await nativeModule.hasNotificationPermission());
      } catch (err) {
        console.warn('[QuickAddModule] hasNotificationPermission check failed:', err);
      }
    }

    return mockNotificationPermission;
  },

  async requestNotificationPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const nativeModule = getNativeModule();
    if (nativeModule?.requestNotificationPermission) {
      try {
        return Boolean(await nativeModule.requestNotificationPermission());
      } catch (err) {
        console.warn('[QuickAddModule] requestNotificationPermission failed:', err);
      }
    }

    mockNotificationPermission = true;
    return true;
  },

  async openOverlay(mode: 'voice' | 'text' = 'text'): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.openOverlay) {
      try {
        return Boolean(await nativeModule.openOverlay(mode));
      } catch (err) {
        console.warn('[QuickAddModule] openOverlay native call failed:', err);
      }
    }

    // Fallback: open via deep link
    const deepLinkUrl = `tabsy://quick-add?mode=${mode}`;
    try {
      if (RN?.Linking?.canOpenURL && RN?.Linking?.openURL) {
        const supported = await RN.Linking.canOpenURL(deepLinkUrl);
        if (supported) {
          await RN.Linking.openURL(deepLinkUrl);
          return true;
        }
      }
    } catch {
      // In-app fallback handled by navigation
    }
    return false;
  },

  async updateOverlayState(amount: string, category: string): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.updateOverlayState) {
      try {
        return Boolean(await nativeModule.updateOverlayState(amount, category));
      } catch (err) {
        console.warn('[QuickAddModule] updateOverlayState native call failed:', err);
      }
    }
    return false;
  },

  async dismissOverlay(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.dismissOverlay) {
      try {
        return Boolean(await nativeModule.dismissOverlay());
      } catch (err) {
        console.warn('[QuickAddModule] dismissOverlay native call failed:', err);
      }
    }
    return false;
  },

  async syncAuthSession(token: string, apiUrl: string): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.syncAuthSession) {
      try {
        return Boolean(await nativeModule.syncAuthSession(token, apiUrl));
      } catch (err) {
        console.warn('[QuickAddModule] syncAuthSession native call failed:', err);
      }
    }
    return true;
  },

  async clearAuthSession(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.clearAuthSession) {
      try {
        return Boolean(await nativeModule.clearAuthSession());
      } catch (err) {
        console.warn('[QuickAddModule] clearAuthSession native call failed:', err);
      }
    }
    return true;
  },

  async getPendingExpenses(): Promise<string> {
    const nativeModule = getNativeModule();
    if (nativeModule?.getPendingExpenses) {
      try {
        return (await nativeModule.getPendingExpenses()) || '[]';
      } catch (err) {
        console.warn('[QuickAddModule] getPendingExpenses native call failed:', err);
      }
    }
    return '[]';
  },

  async clearPendingExpenses(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.clearPendingExpenses) {
      try {
        return Boolean(await nativeModule.clearPendingExpenses());
      } catch (err) {
        console.warn('[QuickAddModule] clearPendingExpenses native call failed:', err);
      }
    }
    return true;
  },

  async syncTheme(themeConfig: QuickAddThemeConfig): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.syncTheme) {
      try {
        return Boolean(await nativeModule.syncTheme(JSON.stringify(themeConfig)));
      } catch (err) {
        console.warn('[QuickAddModule] syncTheme native call failed:', err);
      }
    }
    return true;
  },

  async syncCategories(categories: { name: string; icon?: string }[]): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule?.syncCategories) {
      try {
        return Boolean(await nativeModule.syncCategories(JSON.stringify(categories)));
      } catch (err) {
        console.warn('[QuickAddModule] syncCategories native call failed:', err);
      }
    }
    return true;
  },

  addActionListener(listener: (mode: 'voice' | 'text') => void): () => void {
    if (!RN?.DeviceEventEmitter?.addListener) {
      return () => {};
    }

    const subscription = RN.DeviceEventEmitter.addListener('quickAddAction', (event: any) => {
      const mode = event?.mode === 'voice' ? 'voice' : 'text';
      listener(mode);
    });

    return () => {
      subscription.remove();
    };
  },
};
