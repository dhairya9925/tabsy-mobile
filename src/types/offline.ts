export type OutboxActionType =
  | 'create_personal_expense'
  | 'update_personal_expense'
  | 'delete_personal_expense'
  | 'create_friend_expense'
  | 'update_friend_expense'
  | 'delete_friend_expense'
  | 'create_group_expense'
  | 'update_group_expense'
  | 'delete_group_expense'
  | 'record_friend_payment'
  | 'create_category'
  | 'update_category'
  | 'delete_category';

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
