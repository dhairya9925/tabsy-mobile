/**
 * Cross-platform persistent key-value storage service.
 * Uses @react-native-async-storage/async-storage on native devices,
 * window.localStorage on Web, and an in-memory Map for Node test runners.
 */

const isWeb =
  typeof window !== 'undefined' &&
  typeof (window as any).document !== 'undefined';

const isReactNative =
  !isWeb &&
  typeof navigator !== 'undefined' &&
  (navigator as any)?.product === 'ReactNative';

let AsyncStorageModule: any = null;
if (isReactNative) {
  try {
    AsyncStorageModule = require('@react-native-async-storage/async-storage').default;
  } catch {
    AsyncStorageModule = null;
  }
}

// In-memory fallback (used in unit tests / SSR)
const memoryStore = new Map<string, string>();

export const appStorage = {
  async getItem<T = any>(key: string): Promise<T | null> {
    try {
      if (AsyncStorageModule) {
        const raw = await AsyncStorageModule.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      }
      if (isWeb && typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      }
      const raw = memoryStore.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      console.warn(`[appStorage] Failed to read key "${key}":`, err);
      return null;
    }
  },

  async setItem<T = any>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (AsyncStorageModule) {
        await AsyncStorageModule.setItem(key, serialized);
        return;
      }
      if (isWeb && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
        return;
      }
      memoryStore.set(key, serialized);
    } catch (err) {
      console.warn(`[appStorage] Failed to write key "${key}":`, err);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (AsyncStorageModule) {
        await AsyncStorageModule.removeItem(key);
        return;
      }
      if (isWeb && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      memoryStore.delete(key);
    } catch (err) {
      console.warn(`[appStorage] Failed to remove key "${key}":`, err);
    }
  },

  async clear(): Promise<void> {
    try {
      if (AsyncStorageModule) {
        await AsyncStorageModule.clear();
        return;
      }
      if (isWeb && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
      memoryStore.clear();
    } catch (err) {
      console.warn('[appStorage] Failed to clear storage:', err);
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      if (AsyncStorageModule) {
        const keys = await AsyncStorageModule.getAllKeys();
        return Array.isArray(keys) ? keys : [];
      }
      if (isWeb && typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      return Array.from(memoryStore.keys());
    } catch (err) {
      console.warn('[appStorage] Failed to get all keys:', err);
      return [];
    }
  },
};
