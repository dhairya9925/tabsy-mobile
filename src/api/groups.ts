import { apiClient } from './client';
import {
  Group,
  GroupCreate,
  GroupUpdate,
  GroupMember,
  GroupMemberAdd,
  GroupExpense,
  GroupExpenseCreate,
  GroupExpenseUpdate,
  GroupBalance,
  GroupSettleUpRequest,
} from '../types';

export const groupsApi = {
  /** List all groups the authenticated user belongs to */
  async getGroups(): Promise<Group[]> {
    const res: any = await apiClient.get('/api/v1/groups/');
    return Array.isArray(res) ? res : [];
  },

  /** Get single group details */
  async getGroup(id: string): Promise<Group> {
    const res: any = await apiClient.get(`/api/v1/groups/${id}`);
    return res;
  },

  /** Create a new group */
  async createGroup(payload: GroupCreate): Promise<Group> {
    const res: any = await apiClient.post('/api/v1/groups/', payload);
    return res;
  },

  /** Update group name, description, type */
  async updateGroup(id: string, payload: GroupUpdate): Promise<Group> {
    const res: any = await apiClient.patch(`/api/v1/groups/${id}`, payload);
    return res;
  },

  /** Delete a group */
  async deleteGroup(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${id}`);
  },

  /** List members of a group with joined profile details */
  async getGroupMembers(id: string): Promise<GroupMember[]> {
    const res: any = await apiClient.get(`/api/v1/groups/${id}/members`);
    return Array.isArray(res) ? res : [];
  },

  /** Add a member to a group by email or user ID */
  async addGroupMember(id: string, payload: GroupMemberAdd): Promise<GroupMember> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/members`, payload);
    return res;
  },

  /** Remove a member from a group */
  async removeGroupMember(id: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${id}/members/${userId}`);
  },

  /** Update member role (admin / member) */
  async updateMemberRole(id: string, userId: string, role: string): Promise<GroupMember> {
    const res: any = await apiClient.patch(`/api/v1/groups/${id}/members/${userId}`, { role });
    return res;
  },

  /** Join a group using invite ID */
  async joinGroup(id: string): Promise<GroupMember> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/join`, {});
    return res;
  },

  /** Get group expenses with splits and payer profiles */
  async getGroupExpenses(id: string): Promise<GroupExpense[]> {
    const res: any = await apiClient.get(`/api/v1/groups/${id}/expenses`);
    return Array.isArray(res) ? res : [];
  },

  /** Create a group expense with splits */
  async createGroupExpense(id: string, payload: GroupExpenseCreate): Promise<GroupExpense> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/expenses`, payload);
    return res;
  },

  /** Update a group expense */
  async updateGroupExpense(
    id: string,
    expenseId: string,
    payload: GroupExpenseUpdate
  ): Promise<GroupExpense> {
    const res: any = await apiClient.patch(`/api/v1/groups/${id}/expenses/${expenseId}`, payload);
    return res;
  },

  /** Delete a group expense */
  async deleteGroupExpense(id: string, expenseId: string): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${id}/expenses/${expenseId}`);
  },

  /** Get simplified peer-to-peer group balances */
  async getGroupBalances(id: string): Promise<GroupBalance[]> {
    const res: any = await apiClient.get(`/api/v1/groups/${id}/balances`);
    return Array.isArray(res) ? res : [];
  },

  /** Settle balances between two members */
  async settleUp(id: string, payload: GroupSettleUpRequest): Promise<{ settled_count: number }> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/settle`, payload);
    return res || { settled_count: 0 };
  },
};
