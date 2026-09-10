import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from '../utils/secureStorage';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://65.1.93.155.sslip.io';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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

    if (error.response?.status === 401) {
      // Session expired or invalid
      await secureStorage.clearAll();
    }

    return Promise.reject(new Error(message));
  }
);
