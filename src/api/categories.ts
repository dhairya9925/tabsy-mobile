import { apiClient } from './client';
import { Category, CategoryCreate, CategoryUpdate } from '../types';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { outboxService } from '../services/offline/outboxService';
import { networkService } from '../services/offline/networkService';

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get('/api/v1/categories/');
      const categories = Array.isArray(res) ? res : [];
      await cacheService.set(CACHE_KEYS.CATEGORIES, categories);
      return categories;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  async createCategory(payload: CategoryCreate): Promise<Category> {
    const handleOptimisticCreate = async (): Promise<Category> => {
      const tempId = outboxService.generateTempId('temp-cat');
      const optimistic: Category = {
        id: tempId,
        name: payload.name,
        is_default: false,
      };
      await outboxService.enqueue('create_category', { payload }, tempId);

      const cached = (await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES)) || [];
      await cacheService.set(CACHE_KEYS.CATEGORIES, [...cached, optimistic]);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticCreate();
    }

    try {
      const res: any = await apiClient.post('/api/v1/categories/', payload);
      const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
      if (Array.isArray(cached) && res) {
        await cacheService.set(CACHE_KEYS.CATEGORIES, [...cached, res]);
      } else {
        await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
      }
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticCreate();
      }
      throw err;
    }
  },

  async updateCategory(categoryId: string, payload: CategoryUpdate): Promise<Category> {
    const handleOptimisticUpdate = async (): Promise<Category> => {
      // 1. If pending create in outbox, merge updates
      const updatedPending = await outboxService.updatePendingPayload(
        (a) => a.type === 'create_category' && a.tempId === categoryId,
        (current: any) => ({
          ...current,
          payload: { ...(current.payload || {}), ...payload },
        })
      );

      // If not pending create, enqueue update
      if (!updatedPending) {
        const updatedExisting = await outboxService.updatePendingPayload(
          (a) => a.type === 'update_category' && a.payload?.categoryId === categoryId,
          (current: any) => ({
            ...current,
            payload: { ...(current.payload || {}), ...payload },
          })
        );
        if (!updatedExisting) {
          await outboxService.enqueue('update_category', { categoryId, payload });
        }
      }

      // 2. Update local cache
      const cached = (await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES)) || [];
      const existing = cached.find((c) => c.id === categoryId);
      const optimistic: Category = {
        ...(existing || { id: categoryId, name: payload.name || '', is_default: false }),
        ...payload,
      };

      const refreshed = cached.some((c) => c.id === categoryId)
        ? cached.map((c) => (c.id === categoryId ? optimistic : c))
        : [...cached, optimistic];

      await cacheService.set(CACHE_KEYS.CATEGORIES, refreshed);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticUpdate();
    }

    try {
      const res: any = await apiClient.patch(`/api/v1/categories/${categoryId}`, payload);
      const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
      if (Array.isArray(cached) && res) {
        const refreshed = cached.map((c) => (c.id === categoryId ? { ...c, ...res } : c));
        await cacheService.set(CACHE_KEYS.CATEGORIES, refreshed);
      } else {
        await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
      }
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticUpdate();
      }
      throw err;
    }
  },

  async deleteCategory(categoryId: string): Promise<{ meta?: any }> {
    const handleOptimisticDelete = async (): Promise<{ meta?: any }> => {
      // 1. If this was a pending offline creation, simply remove it from outbox
      const removedCreations = await outboxService.removeMatching(
        (a) => a.tempId === categoryId || (a.type === 'create_category' && a.tempId === categoryId)
      );

      // Clean up any pending updates for this categoryId
      await outboxService.removeMatching(
        (a) => a.type === 'update_category' && a.payload?.categoryId === categoryId
      );

      // If it wasn't a local creation, enqueue delete_category
      if (removedCreations === 0) {
        await outboxService.enqueue('delete_category', { categoryId });
      }

      // 2. Remove from local cache
      const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
      if (Array.isArray(cached)) {
        const filtered = cached.filter((c) => c.id !== categoryId);
        await cacheService.set(CACHE_KEYS.CATEGORIES, filtered);
      }
      return { meta: { deleted: true } };
    };

    if (!networkService.isOnline()) {
      return handleOptimisticDelete();
    }

    try {
      const res: any = await apiClient.delete(`/api/v1/categories/${categoryId}`);
      const cached = await cacheService.get<Category[]>(CACHE_KEYS.CATEGORIES);
      if (Array.isArray(cached)) {
        const filtered = cached.filter((c) => c.id !== categoryId);
        await cacheService.set(CACHE_KEYS.CATEGORIES, filtered);
      } else {
        await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
      }
      return res || { meta: { deleted: true } };
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticDelete();
      }
      throw err;
    }
  },
};
