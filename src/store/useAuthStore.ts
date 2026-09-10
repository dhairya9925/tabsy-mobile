import { create } from 'zustand';
import { authApi, LoginPayload, SignupPayload } from '../api/auth';
import { UserProfile } from '../types';
import { secureStorage } from '../utils/secureStorage';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;

  initializeSession: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
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

        // Background profile refresh
        authApi.getMe()
          .then((freshUser) => {
            set({ user: freshUser });
            secureStorage.setCachedUser(freshUser);
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

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Ignore network error on logout
    } finally {
      await secureStorage.clearAll();
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
  },
}));
