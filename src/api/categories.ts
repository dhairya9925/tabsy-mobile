import { apiClient } from './client';
import { Category, CategoryCreate, CategoryUpdate } from '../types';

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    const res: any = await apiClient.get('/api/v1/categories/');
    return Array.isArray(res) ? res : [];
  },

  async createCategory(payload: CategoryCreate): Promise<Category> {
    const res: any = await apiClient.post('/api/v1/categories/', payload);
    return res;
  },

  async updateCategory(categoryId: string, payload: CategoryUpdate): Promise<Category> {
    const res: any = await apiClient.patch(`/api/v1/categories/${categoryId}`, payload);
    return res;
  },

  async deleteCategory(categoryId: string): Promise<{ meta?: any }> {
    const res: any = await apiClient.delete(`/api/v1/categories/${categoryId}`);
    return res || {};
  },
};
