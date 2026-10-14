import { apiClient } from './client';
import { Category, CategoryCreate, CategoryUpdate } from '../types';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
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
    const res: any = await apiClient.post('/api/v1/categories/', payload);
    await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
    return res;
  },

  async updateCategory(categoryId: string, payload: CategoryUpdate): Promise<Category> {
    const res: any = await apiClient.patch(`/api/v1/categories/${categoryId}`, payload);
    await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
    return res;
  },

  async deleteCategory(categoryId: string): Promise<{ meta?: any }> {
    const res: any = await apiClient.delete(`/api/v1/categories/${categoryId}`);
    await cacheService.invalidate(CACHE_KEYS.CATEGORIES);
    return res || {};
  },
};
