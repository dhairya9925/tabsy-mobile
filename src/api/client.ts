import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from '../utils/secureStorage';

const isWeb =
  typeof window !== 'undefined' &&
  typeof (window as any).document !== 'undefined';

const isReactNative =
  !isWeb &&
  typeof navigator !== 'undefined' &&
  (navigator as any)?.product === 'ReactNative';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const isWebLocalhost =
  isWeb &&
  typeof window !== 'undefined' &&
  !!window.location &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * Dynamically extract developer host from NativeModules.SourceCode.scriptURL
 * (e.g. "http://10.254.155.231:8081/index.bundle..." -> "10.254.155.231").
 * When running in Expo Go on a physical device over Wi-Fi, this gives the workstation LAN IP.
 * When running over USB with adb reverse, it returns "localhost".
 */
export function getDevHost(): string {
  if (!isReactNative) {
    return 'localhost';
  }
  try {
    // Dynamic require so Node.js tsx test runner does not attempt to parse react-native Flow files
    const rn = require('react-native');
    const scriptURL = rn?.NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch {
    // fallback to localhost
  }
  return 'localhost';
}

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/^["']|["']$/g, '').trim();
  if (envUrl) {
    // If explicitly pointing to localhost on native mobile, convert to dev workstation IP
    if (isReactNative && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      const devHost = getDevHost();
      if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
        return envUrl.replace(/localhost|127\.0\.0\.1/, devHost);
      }
    }
    return envUrl;
  }

  if (isDev) {
    if (isWebLocalhost) {
      return 'http://localhost:8000';
    }
    const host = getDevHost();
    return `http://${host}:8000`;
  }
  return 'https://65.1.93.155.sslip.io';
}

const rawBaseUrl = resolveApiBaseUrl();
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

console.log(`[Tabsy API] Base URL resolved to: ${API_BASE_URL}`);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function isPublicAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/signup');
}

export function isExcludedFromAutoLogout(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/logout')
  );
}

let activeLogoutPromise: Promise<void> | null = null;

export async function triggerAutoLogout(): Promise<void> {
  if (activeLogoutPromise) {
    return activeLogoutPromise;
  }

  activeLogoutPromise = (async () => {
    try {
      // 1. Wipe secure storage immediately
      await secureStorage.clearAll();

      // 2. Invoke registered auth store unauthorized handler
      if (unauthorizedHandler) {
        await unauthorizedHandler();
      } else {
        // Dynamic fallback if handler was not set
        try {
          const { useAuthStore } = require('../store/useAuthStore');
          if (useAuthStore?.getState) {
            await useAuthStore.getState().logout({ skipServerLogout: true });
          }
        } catch (err) {
          console.warn('[Tabsy API] Dynamic useAuthStore logout failed:', err);
        }
      }
    } catch (err) {
      console.warn('[Tabsy API] Error during triggerAutoLogout:', err);
    } finally {
      activeLogoutPromise = null;
    }
  })();

  return activeLogoutPromise;
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';
    const isPublic = isPublicAuthEndpoint(url);
    const existingAuth = config.headers?.Authorization;

    const token = await secureStorage.getAuthToken();
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (!existingAuth && !isPublic) {
      console.warn(`[Tabsy API] Missing authorization token (bearer) for endpoint: ${url}`);
      await triggerAutoLogout();
      return Promise.reject(new Error('Missing authorization token (bearer)'));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    // If wrapped in ResponseEnvelope ({ data, error, meta })
    if (response.data && typeof response.data === 'object') {
      if ('error' in response.data && response.data.error !== null) {
        return Promise.reject(new Error(response.data.error));
      }
      if ('data' in response.data) {
        return response.data.data;
      }
    }
    return response.data;
  },
  async (error: AxiosError<any>) => {
    const config = error.config as any;

    // In development mode on physical devices, ONLY if using local dev server (port 8000/localhost)
    // attempt a 1-time fallback between localhost:8000 and the detected dev host IP on port 8000.
    if (isDev && config && !config._isRetry && (!error.response || error.message === 'Network Error')) {
      const currentBase = config.baseURL || API_BASE_URL;
      const isLocalHost = currentBase.includes(':8000') || currentBase.includes('localhost') || currentBase.includes('127.0.0.1');

      if (isLocalHost) {
        config._isRetry = true;
        const devHost = getDevHost();
        let fallbackBase = '';

        if (currentBase.includes('localhost') || currentBase.includes('127.0.0.1')) {
          if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
            fallbackBase = `http://${devHost}:8000`;
          } else {
            fallbackBase = 'http://10.254.155.231:8000';
          }
        } else {
          fallbackBase = 'http://localhost:8000';
        }

        if (fallbackBase && fallbackBase !== currentBase) {
          config.baseURL = fallbackBase;
          apiClient.defaults.baseURL = fallbackBase;
          try {
            return await apiClient.request(config);
          } catch {
            // Continue to standard error extraction below
          }
        }
      }
    }

    let message = 'Network connection failed';
    if (error.response?.data) {
      if (typeof error.response.data === 'object') {
        message = error.response.data.error || error.response.data.detail || JSON.stringify(error.response.data);
      } else if (typeof error.response.data === 'string') {
        message = error.response.data;
      }
    } else if (error.message) {
      message = error.message;
    }

    if (error.response?.status === 401 && !isExcludedFromAutoLogout(error.config?.url)) {
      // Session expired, invalid, or missing token on backend
      console.warn(`[Tabsy API] 401 Unauthorized for ${error.config?.url}. Triggering auto-logout.`);
      await triggerAutoLogout();
    }

    return Promise.reject(new Error(message));
  }
);
