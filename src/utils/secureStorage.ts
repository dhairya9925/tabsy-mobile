import type { UserProfile } from '../types';

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  // Safe dynamic import to allow tests to run in Node without React Native native runtime
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const TOKEN_KEY = 'splittrack_access_token';
const USER_KEY = 'splittrack_cached_user';

let inMemoryToken: string | null = null;
let inMemoryUser: UserProfile | null = null;

export const secureStorage = {
  async getAuthToken(): Promise<string | null> {
    if (inMemoryToken) return inMemoryToken;
    if (SecureStore) {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        inMemoryToken = token;
        return token;
      } catch {
        return inMemoryToken;
      }
    }
    return inMemoryToken;
  },

  async setAuthToken(token: string): Promise<void> {
    inMemoryToken = token;
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } catch (err) {
        console.warn('SecureStore set token error', err);
      }
    }
  },

  async removeAuthToken(): Promise<void> {
    inMemoryToken = null;
    if (SecureStore) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch (err) {
        console.warn('SecureStore delete token error', err);
      }
    }
  },

  async getCachedUser(): Promise<UserProfile | null> {
    if (inMemoryUser) return inMemoryUser;
    if (SecureStore) {
      try {
        const raw = await SecureStore.getItemAsync(USER_KEY);
        if (raw) {
          inMemoryUser = JSON.parse(raw);
          return inMemoryUser;
        }
        return null;
      } catch {
        return inMemoryUser;
      }
    }
    return inMemoryUser;
  },

  async setCachedUser(user: UserProfile): Promise<void> {
    inMemoryUser = user;
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      } catch (err) {
        console.warn('SecureStore set user error', err);
      }
    }
  },

  async removeCachedUser(): Promise<void> {
    inMemoryUser = null;
    if (SecureStore) {
      try {
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch (err) {
        console.warn('SecureStore delete user error', err);
      }
    }
  },

  async clearAll(): Promise<void> {
    inMemoryToken = null;
    inMemoryUser = null;
    if (SecureStore) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch (err) {
        console.warn('SecureStore clearAll error', err);
      }
    }
  },
};
