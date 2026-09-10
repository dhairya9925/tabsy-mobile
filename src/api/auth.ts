import { apiClient } from './client';
import { AuthResponse, UserProfile } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  display_name?: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient.post('/api/v1/auth/login', {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
  },

  async signup(payload: SignupPayload): Promise<AuthResponse> {
    return apiClient.post('/api/v1/auth/signup', {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      display_name: payload.display_name?.trim() || null,
    });
  },

  async logout(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/api/v1/auth/logout');
    } catch {
      return { message: 'Logged out' };
    }
  },

  async getMe(): Promise<UserProfile> {
    return apiClient.get('/api/v1/users/me');
  },

  async updateProfile(payload: { display_name?: string | null; avatar_url?: string | null }): Promise<UserProfile> {
    return apiClient.patch('/api/v1/users/me', payload);
  },

  async deleteAccount(): Promise<{ message: string }> {
    return apiClient.delete('/api/v1/auth/account');
  },
};
