import { create } from 'zustand';
import { authApi, LoginPayload, SignupPayload } from '../api/auth';
import { UserProfile } from '../types';
import { secureStorage } from '../utils/secureStorage';
import { QuickAddModule } from '../native/QuickAddModule';
import { resolveApiBaseUrl, setUnauthorizedHandler } from '../api/client';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { preloadOfflineData, preloadService, outboxService } from '../services/offline';


interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;

  initializeSession: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: (options?: { skipServerLogout?: boolean }) => Promise<void>;
  setUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  isAuthenticated: false,

  initializeSession: async () => {
    try {
      set({ isLoading: true });
      const storedToken = await secureStorage.getAuthToken();
      const cachedUser = await secureStorage.getCachedUser();

      if (storedToken) {
        set({
          token: storedToken,
          user: cachedUser,
          isAuthenticated: true,
        });

        if (cachedUser) {
          cacheService.set(CACHE_KEYS.USER_PROFILE, cachedUser).catch(() => {});
        }

        // Sync token and user id to native quick-add preferences
        QuickAddModule.syncAuthSession(storedToken, resolveApiBaseUrl(), cachedUser?.id || (cachedUser as any)?.user_id || '').catch(() => {});

        // Eagerly preload and cache offline data in the background
        preloadOfflineData().catch(() => {});

        // Background profile refresh
        authApi.getMe()
          .then((freshUser) => {
            set({ user: freshUser });
            secureStorage.setCachedUser(freshUser);
            cacheService.set(CACHE_KEYS.USER_PROFILE, freshUser).catch(() => {});
            QuickAddModule.syncAuthSession(storedToken, resolveApiBaseUrl(), freshUser?.id || (freshUser as any)?.user_id || '').catch(() => {});
          })
          .catch(() => {
            // Keep cached user if offline
          });
      } else {
        set({ token: null, user: null, isAuthenticated: false });
      }
    } catch {
      set({ token: null, user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(payload);
      await secureStorage.setAuthToken(response.access_token);
      await secureStorage.setCachedUser(response.user);
      await cacheService.set(CACHE_KEYS.USER_PROFILE, response.user);

      // Sync token and user id to native quick-add preferences
      QuickAddModule.syncAuthSession(response.access_token, resolveApiBaseUrl(), response.user?.id || (response.user as any)?.user_id || '').catch(() => {});

      // Eagerly preload offline data on successful login
      preloadOfflineData({ force: true }).catch(() => {});

      set({
        token: response.access_token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signup: async (payload: SignupPayload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.signup(payload);
      await secureStorage.setAuthToken(response.access_token);
      await secureStorage.setCachedUser(response.user);
      await cacheService.set(CACHE_KEYS.USER_PROFILE, response.user);

      // Sync token and user id to native quick-add preferences
      QuickAddModule.syncAuthSession(response.access_token, resolveApiBaseUrl(), response.user?.id || (response.user as any)?.user_id || '').catch(() => {});

      // Eagerly preload offline data on successful signup
      preloadOfflineData({ force: true }).catch(() => {});

      set({
        token: response.access_token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async (options?: { skipServerLogout?: boolean }) => {
    set({ isLoading: true });
    if (!options?.skipServerLogout) {
      try {
        await authApi.logout();
      } catch {
        // Ignore network error on logout
      }
    }
    try {
      try {
        await QuickAddModule.stopQuickAddService();
        await QuickAddModule.clearAuthSession();
      } catch {
        // Non-blocking cleanup
      }
      await secureStorage.clearAll();
      await cacheService.invalidatePattern('cache:');
      try {
        await outboxService.clear();
      } catch {
        // Non-blocking cleanup
      }
      preloadService.reset();
    } finally {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: UserProfile) => {
    set({ user });
    secureStorage.setCachedUser(user);
    cacheService.set(CACHE_KEYS.USER_PROFILE, user).catch(() => {});
  },
}));

// Automatically log out user if authorization token is missing or invalid (HTTP 401)
setUnauthorizedHandler(async () => {
  await useAuthStore.getState().logout({ skipServerLogout: true });
});
