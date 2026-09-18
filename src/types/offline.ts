export type OutboxActionType =
  | 'create_personal_expense'
  | 'create_friend_expense'
  | 'create_group_expense';

export interface OutboxAction<T = any> {
  id: string;
  type: OutboxActionType;
  payload: T;
  createdAt: number;
  retryCount: number;
  lastError?: string | null;
  tempId?: string;
}

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl?: number; // Time-to-live in milliseconds
}

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}
