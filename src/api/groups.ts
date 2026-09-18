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
  MonthlySettlement,
  MemberMonthlyStatus,
  SettlementExpense,
  MonthlyLedgerResponse,
  MonthlyLedgerContributionPayload,
  MonthlyLedgerDisbursementPayload,
  MonthlyLedgerDisbursement,
  MonthlyLedgerLockPayload,
} from '../types';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { outboxService } from '../services/offline/outboxService';
import { networkService } from '../services/offline/networkService';

export const groupsApi = {
  /** List all groups the authenticated user belongs to */
  async getGroups(): Promise<Group[]> {
    if (!networkService.isOnline()) {
      const cached = await cacheService.get<Group[]>(CACHE_KEYS.GROUPS_LIST);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }

    try {
      const res: any = await apiClient.get('/api/v1/groups/');
      const groups = Array.isArray(res) ? res : [];
      if (groups.length > 0) {
        await cacheService.set(CACHE_KEYS.GROUPS_LIST, groups);
      }
      return groups;
    } catch (err) {
      const cached = await cacheService.get<Group[]>(CACHE_KEYS.GROUPS_LIST);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      return [];
    }
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

  /** Join a group using invite code or group ID */
  async joinGroup(idOrCode: string): Promise<GroupMember> {
    const trimmed = idOrCode.trim();
    const res: any = await apiClient.post('/api/v1/groups/join', { code: trimmed });
    return res;
  },

  /** Get group expenses with splits and payer profiles */
  async getGroupExpenses(id: string): Promise<GroupExpense[]> {
    const res: any = await apiClient.get(`/api/v1/groups/${id}/expenses`);
    return Array.isArray(res) ? res : [];
  },

  /** Create a group expense with splits */
  async createGroupExpense(id: string, payload: GroupExpenseCreate): Promise<GroupExpense> {
    if (!networkService.isOnline()) {
      const tempId = outboxService.generateTempId('temp-grp-exp');
      await outboxService.enqueue('create_group_expense', { groupId: id, payload }, tempId);
      await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
      await cacheService.invalidatePattern(`cache:monthly_ledger:${id}`);
      return {
        id: tempId,
        group_id: id,
        paid_by: payload.paid_by,
        amount: payload.amount,
        category: payload.category,
        note: payload.note,
        expense_date: payload.expense_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        splits: payload.splits || [],
      } as any;
    }

    try {
      const res: any = await apiClient.post(`/api/v1/groups/${id}/expenses`, payload);
      await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
      await cacheService.invalidatePattern(`cache:monthly_ledger:${id}`);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        const tempId = outboxService.generateTempId('temp-grp-exp');
        await outboxService.enqueue('create_group_expense', { groupId: id, payload }, tempId);
        return {
          id: tempId,
          group_id: id,
          paid_by: payload.paid_by,
          amount: payload.amount,
          category: payload.category,
          note: payload.note,
          expense_date: payload.expense_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          splits: payload.splits || [],
        } as any;
      }
      throw err;
    }
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
    const cacheKey = `cache:group_balances:${id}`;
    if (!networkService.isOnline()) {
      const cached = await cacheService.get<GroupBalance[]>(cacheKey);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${id}/balances`);
      const balances = Array.isArray(res) ? res : [];
      if (balances.length > 0) {
        await cacheService.set(cacheKey, balances);
      }
      return balances;
    } catch (err) {
      const cached = await cacheService.get<GroupBalance[]>(cacheKey);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      return [];
    }
  },

  /** Settle balances between two members */
  async settleUp(id: string, payload: GroupSettleUpRequest): Promise<{ settled_count: number }> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/settle`, payload);
    return res || { settled_count: 0 };
  },

  /** Get monthly settlement status for a specific month and year */
  async getMonthlySettlement(groupId: string, month: number, year: number): Promise<MonthlySettlement | null> {
    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlements/${month}/${year}`);
      return res || null;
    } catch {
      return null;
    }
  },

  /** Get expenses included in a specific monthly settlement */
  async getMonthlySettlementExpenses(groupId: string, month: number, year: number): Promise<SettlementExpense[]> {
    const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlements/${month}/${year}/expenses`);
    return Array.isArray(res) ? res : [];
  },

  /** Get member finalization statuses for a settlement */
  async getMemberMonthlyStatus(groupId: string, settlementId: string): Promise<MemberMonthlyStatus[]> {
    const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlements/${settlementId}/member-status`);
    return Array.isArray(res) ? res : [];
  },

  /** Create or initialize a monthly settlement */
  async createMonthlySettlement(groupId: string, month: number, year: number): Promise<MonthlySettlement> {
    return apiClient.post(`/api/v1/groups/${groupId}/settlements/${month}/${year}`);
  },

  /** Finalize a monthly settlement */
  async finalizeMonthlySettlement(groupId: string, month: number, year: number): Promise<MonthlySettlement> {
    return apiClient.post(`/api/v1/groups/${groupId}/settlements/${month}/${year}/finalize`);
  },

  /** Mark current user expenses complete for a monthly settlement */
  async markMemberCompleted(groupId: string, settlementId: string): Promise<MemberMonthlyStatus> {
    return apiClient.post(`/api/v1/groups/${groupId}/settlements/${settlementId}/member-status`);
  },

  /** Shared Living: Get complete Monthly Household Ledger */
  async getMonthlyLedger(groupId: string, month: number, year: number): Promise<MonthlyLedgerResponse | null> {
    const cacheKey = CACHE_KEYS.MONTHLY_LEDGER(groupId, year, month);

    if (!networkService.isOnline()) {
      const cached = await cacheService.get<MonthlyLedgerResponse>(cacheKey);
      if (cached) return cached;
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/monthly-ledger?month=${month}&year=${year}`);
      if (res) {
        await cacheService.set(cacheKey, res);
      }
      return res || null;
    } catch (err: any) {
      const cached = await cacheService.get<MonthlyLedgerResponse>(cacheKey);
      if (cached) return cached;
      console.log('[groupsApi.getMonthlyLedger] non-fatal:', err?.message || err);
      return null;
    }
  },

  /** Shared Living: Record a member payment contribution */
  async recordMonthlyLedgerContribution(
    groupId: string,
    month: number,
    year: number,
    payload: MonthlyLedgerContributionPayload
  ): Promise<MemberMonthlyStatus> {
    const res: any = await apiClient.post(
      `/api/v1/groups/${groupId}/monthly-ledger/contributions?month=${month}&year=${year}`,
      payload
    );
    return res;
  },

  /** Shared Living: Record a coordinator disbursement (vendor bill / member refund) */
  async recordMonthlyLedgerDisbursement(
    groupId: string,
    month: number,
    year: number,
    payload: MonthlyLedgerDisbursementPayload
  ): Promise<MonthlyLedgerDisbursement> {
    const res: any = await apiClient.post(
      `/api/v1/groups/${groupId}/monthly-ledger/disbursements?month=${month}&year=${year}`,
      payload
    );
    return res;
  },

  /** Shared Living: Lock the monthly cycle and roll forward unrefunded overpayments */
  async lockMonthlyLedger(
    groupId: string,
    month: number,
    year: number,
    payload: MonthlyLedgerLockPayload
  ): Promise<MonthlySettlement> {
    const res: any = await apiClient.post(
      `/api/v1/groups/${groupId}/monthly-ledger/lock?month=${month}&year=${year}`,
      payload
    );
    return res;
  },
};
