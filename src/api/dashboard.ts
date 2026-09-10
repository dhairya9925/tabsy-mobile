import { apiClient } from './client';
import { DashboardData } from '../types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardData> => {
    const res: any = await apiClient.get('/api/v1/dashboard/summary');
    return res;
  },
};
