import { apiClient } from './client';
import {
  Group,
  GroupCreate,
  GroupUpdate,
  GroupMember,
  GroupMemberAdd,
  GroupExpense,
  GroupExpenseSplit,
  GroupExpenseCreate,
  GroupExpenseUpdate,
  GroupBalance,
  GroupSettleUpRequest,
  GroupSettlementRecord,
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
    const cached = await cacheService.get<Group[]>(CACHE_KEYS.GROUPS_LIST);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get('/api/v1/groups/');
      const groups = Array.isArray(res) ? res : [];
      await cacheService.set(CACHE_KEYS.GROUPS_LIST, groups);
      return groups;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  /** Get single group details */
  async getGroup(id: string): Promise<Group> {
    const cacheKey = CACHE_KEYS.GROUP_DETAIL(id);
    const cached = await cacheService.get<Group>(cacheKey);

    if (!networkService.isOnline()) {
      if (cached) return cached;
      const groups = await cacheService.get<Group[]>(CACHE_KEYS.GROUPS_LIST);
      const found = groups?.find((g) => g.id === id);
      if (found) return found;
      throw new Error('Offline — group not found');
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${id}`);
      if (res) {
        await cacheService.set(cacheKey, res);
      }
      return res;
    } catch (err) {
      if (cached) return cached;
      const groups = await cacheService.get<Group[]>(CACHE_KEYS.GROUPS_LIST);
      const found = groups?.find((g) => g.id === id);
      if (found) return found;
      throw err;
    }
  },

  /** Create a new group */
  async createGroup(payload: GroupCreate): Promise<Group> {
    const res: any = await apiClient.post('/api/v1/groups/', payload);
    await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
    return res;
  },

  /** Update group name, description, type */
  async updateGroup(id: string, payload: GroupUpdate): Promise<Group> {
    const res: any = await apiClient.patch(`/api/v1/groups/${id}`, payload);
    await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
    await cacheService.invalidate(CACHE_KEYS.GROUP_DETAIL(id));
    return res;
  },

  /** Delete a group */
  async deleteGroup(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${id}`);
    await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
    await cacheService.invalidate(CACHE_KEYS.GROUP_DETAIL(id));
  },

  /** List members of a group with joined profile details */
  async getGroupMembers(id: string): Promise<GroupMember[]> {
    const cacheKey = CACHE_KEYS.GROUP_MEMBERS(id);
    const cached = await cacheService.get<GroupMember[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${id}/members`);
      const members = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, members);
      return members;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  /** Add a member to a group by email or user ID */
  async addGroupMember(id: string, payload: GroupMemberAdd): Promise<GroupMember> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/members`, payload);
    await cacheService.invalidate(CACHE_KEYS.GROUP_MEMBERS(id));
    return res;
  },

  /** Remove a member from a group */
  async removeGroupMember(id: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${id}/members/${userId}`);
    await cacheService.invalidate(CACHE_KEYS.GROUP_MEMBERS(id));
  },

  /** Update member role (admin / member) */
  async updateMemberRole(id: string, userId: string, role: string): Promise<GroupMember> {
    const res: any = await apiClient.patch(`/api/v1/groups/${id}/members/${userId}`, { role });
    await cacheService.invalidate(CACHE_KEYS.GROUP_MEMBERS(id));
    return res;
  },

  /** Join a group using invite code or group ID */
  async joinGroup(idOrCode: string): Promise<GroupMember> {
    const trimmed = idOrCode.trim();
    const res: any = await apiClient.post('/api/v1/groups/join', { code: trimmed });
    await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
    return res;
  },

  /** Get group expenses with splits and payer profiles */
  async getGroupExpenses(id: string): Promise<GroupExpense[]> {
    const cacheKey = CACHE_KEYS.GROUP_EXPENSES(id);
    const cached = await cacheService.get<GroupExpense[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${id}/expenses`);
      const expenses = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, expenses);
      return expenses;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  /** Create a group expense with splits */
  async createGroupExpense(id: string, payload: GroupExpenseCreate): Promise<GroupExpense> {
    const cacheKey = CACHE_KEYS.GROUP_EXPENSES(id);

    const handleOptimisticCreate = async (): Promise<GroupExpense> => {
      const tempId = outboxService.generateTempId('temp-grp-exp');
      await outboxService.enqueue('create_group_expense', { groupId: id, payload }, tempId);
      const resolvedSplits: GroupExpenseSplit[] = payload.splits
        ? payload.splits.map((s, idx) => ({
            id: `temp-split-${idx}`,
            expense_id: tempId,
            user_id: s.user_id,
            amount: s.amount,
            is_settled: false,
            created_at: new Date().toISOString(),
          }))
        : [];
      const optimistic: GroupExpense = {
        id: tempId,
        group_id: id,
        user_id: '',
        paid_by: payload.paid_by,
        amount: payload.amount,
        category: payload.category,
        note: payload.note || null,
        expense_date: payload.expense_date || new Date().toISOString().split('T')[0],
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        splits: resolvedSplits,
        is_pending_sync: true,
      };

      const cached = (await cacheService.get<GroupExpense[]>(cacheKey)) || [];
      await cacheService.set(cacheKey, [optimistic, ...cached]);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticCreate();
    }

    try {
      const res: any = await apiClient.post(`/api/v1/groups/${id}/expenses`, payload);
      const cached = await cacheService.get<GroupExpense[]>(cacheKey);
      if (Array.isArray(cached) && res) {
        await cacheService.set(cacheKey, [res, ...cached]);
      }
      await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
      await cacheService.invalidatePattern(`cache:monthly_ledger:${id}`);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticCreate();
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
    const cacheKey = CACHE_KEYS.GROUP_EXPENSES(id);

    const handleOptimisticUpdate = async (): Promise<GroupExpense> => {
      // 1. If pending create in outbox, merge updates
      const updatedPending = await outboxService.updatePendingPayload(
        (a) => a.type === 'create_group_expense' && a.tempId === expenseId,
        (current: any) => ({
          ...current,
          payload: { ...(current.payload || {}), ...payload },
        })
      );

      // If not pending create, enqueue update
      if (!updatedPending) {
        const updatedExisting = await outboxService.updatePendingPayload(
          (a) =>
            a.type === 'update_group_expense' &&
            a.payload?.groupId === id &&
            a.payload?.expenseId === expenseId,
          (current: any) => ({
            ...current,
            payload: { ...(current.payload || {}), ...payload },
          })
        );
        if (!updatedExisting) {
          await outboxService.enqueue('update_group_expense', {
            groupId: id,
            expenseId,
            payload,
          });
        }
      }

      // 2. Update local cache
      const cached = (await cacheService.get<GroupExpense[]>(cacheKey)) || [];
      const existing = cached.find((item) => item.id === expenseId);
      const resolvedSplits = payload.splits
        ? payload.splits.map((s, idx) => ({
            id: `temp-split-${idx}`,
            expense_id: expenseId,
            user_id: s.user_id,
            amount: s.amount,
            is_settled: false,
            created_at: new Date().toISOString(),
          }))
        : existing?.splits || [];

      const optimistic: GroupExpense = {
        ...(existing || {
          id: expenseId,
          group_id: id,
          user_id: '',
          paid_by: '',
          amount: 0,
          category: 'other',
          expense_date: new Date().toISOString().split('T')[0],
          status: 'submitted',
          splits: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        ...payload,
        splits: resolvedSplits,
        updated_at: new Date().toISOString(),
        is_pending_sync: true,
      };

      const refreshed = cached.some((item) => item.id === expenseId)
        ? cached.map((item) => (item.id === expenseId ? optimistic : item))
        : [optimistic, ...cached];

      await cacheService.set(cacheKey, refreshed);
      return optimistic;
    };

    if (!networkService.isOnline()) {
      return handleOptimisticUpdate();
    }

    try {
      const res: any = await apiClient.patch(`/api/v1/groups/${id}/expenses/${expenseId}`, payload);
      const cached = await cacheService.get<GroupExpense[]>(cacheKey);
      if (Array.isArray(cached) && res) {
        const refreshed = cached.map((item) => (item.id === expenseId ? { ...item, ...res } : item));
        await cacheService.set(cacheKey, refreshed);
      }
      await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
      await cacheService.invalidatePattern(`cache:monthly_ledger:${id}`);
      return res;
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticUpdate();
      }
      throw err;
    }
  },

  /** Delete a group expense */
  async deleteGroupExpense(id: string, expenseId: string): Promise<void> {
    const cacheKey = CACHE_KEYS.GROUP_EXPENSES(id);

    const handleOptimisticDelete = async (): Promise<void> => {
      // 1. If this was a pending offline creation, simply remove it from outbox
      const removedCreations = await outboxService.removeMatching(
        (a) => a.tempId === expenseId || (a.type === 'create_group_expense' && a.tempId === expenseId)
      );

      // Clean up any pending updates for this expenseId
      await outboxService.removeMatching(
        (a) =>
          a.type === 'update_group_expense' &&
          a.payload?.groupId === id &&
          a.payload?.expenseId === expenseId
      );

      // If it wasn't a local creation, enqueue delete_group_expense
      if (removedCreations === 0) {
        await outboxService.enqueue('delete_group_expense', { groupId: id, expenseId });
      }

      // 2. Remove from local cache
      const cached = await cacheService.get<GroupExpense[]>(cacheKey);
      if (Array.isArray(cached)) {
        const filtered = cached.filter((item) => item.id !== expenseId);
        await cacheService.set(cacheKey, filtered);
      }
    };

    if (!networkService.isOnline()) {
      return handleOptimisticDelete();
    }

    try {
      await apiClient.delete(`/api/v1/groups/${id}/expenses/${expenseId}`);
      const cached = await cacheService.get<GroupExpense[]>(cacheKey);
      if (Array.isArray(cached)) {
        const filtered = cached.filter((item) => item.id !== expenseId);
        await cacheService.set(cacheKey, filtered);
      }
      await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
      await cacheService.invalidatePattern(`cache:monthly_ledger:${id}`);
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        return handleOptimisticDelete();
      }
      throw err;
    }
  },

  /** Get simplified peer-to-peer group balances */
  async getGroupBalances(id: string): Promise<GroupBalance[]> {
    const cacheKey = `cache:group_balances:${id}`;
    const cached = await cacheService.get<GroupBalance[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${id}/balances`);
      const balances = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, balances);
      return balances;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  /** Settle balances between two members and return the full settlement record */
  async settleUp(id: string, payload: GroupSettleUpRequest): Promise<GroupSettlementRecord> {
    const res: any = await apiClient.post(`/api/v1/groups/${id}/settle`, payload);
    await cacheService.invalidate(`cache:group_balances:${id}`);
    await cacheService.invalidate(CACHE_KEYS.GROUP_EXPENSES(id));
    await cacheService.invalidate(CACHE_KEYS.GROUPS_LIST);
    await cacheService.invalidate(CACHE_KEYS.GROUP_SETTLEMENT_RECORDS(id));
    const record: GroupSettlementRecord = res?.settlement_record ?? res;
    return record;
  },

  /** List all settlement records for a group */
  async getSettlementRecords(groupId: string): Promise<GroupSettlementRecord[]> {
    const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT_RECORDS(groupId);
    const cached = await cacheService.get<GroupSettlementRecord[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlement-records`);
      const records = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, records);
      return records;
    } catch (err) {
      return hasCached ? cached! : [];
    }
  },

  /** Get a specific settlement record */
  async getSettlementRecord(groupId: string, recordId: string): Promise<GroupSettlementRecord> {
    const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT_RECORDS(groupId);
    const cachedList = await cacheService.get<GroupSettlementRecord[]>(cacheKey);
    const found = cachedList?.find((r) => r.id === recordId);

    if (!networkService.isOnline()) {
      if (found) return found;
      throw new Error('Offline — settlement record not found');
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlement-records/${recordId}`);
      return res;
    } catch (err) {
      if (found) return found;
      throw err;
    }
  },

  /** Update settlement record note */
  async updateSettlementRecord(
    groupId: string,
    recordId: string,
    payload: { note?: string }
  ): Promise<GroupSettlementRecord> {
    const res: any = await apiClient.patch(
      `/api/v1/groups/${groupId}/settlement-records/${recordId}`,
      payload
    );
    const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT_RECORDS(groupId);
    const cached = await cacheService.get<GroupSettlementRecord[]>(cacheKey);
    if (Array.isArray(cached) && res) {
      const updated = cached.map((r) => (r.id === recordId ? { ...r, ...res } : r));
      await cacheService.set(cacheKey, updated);
    } else {
      await cacheService.invalidate(cacheKey);
    }
    return res;
  },

  /** Delete a settlement record within 3-day window */
  async deleteSettlementRecord(groupId: string, recordId: string): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${groupId}/settlement-records/${recordId}`);
    const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT_RECORDS(groupId);
    const cached = await cacheService.get<GroupSettlementRecord[]>(cacheKey);
    if (Array.isArray(cached)) {
      const filtered = cached.filter((r) => r.id !== recordId);
      await cacheService.set(cacheKey, filtered);
    } else {
      await cacheService.invalidate(cacheKey);
    }
    await cacheService.invalidate(`cache:group_balances:${groupId}`);
    await cacheService.invalidate(CACHE_KEYS.GROUP_EXPENSES(groupId));
  },

  /** Reverse a settlement record (alias for deleteSettlementRecord) */
  async reverseSettlementRecord(groupId: string, recordId: string): Promise<void> {
    return this.deleteSettlementRecord(groupId, recordId);
  },

  /** Get monthly settlement status for a specific month and year */
  async getMonthlySettlement(groupId: string, month: number, year: number): Promise<MonthlySettlement | null> {
    const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT(groupId, month, year);
    const cached = await cacheService.get<MonthlySettlement>(cacheKey);

    if (!networkService.isOnline()) {
      return cached || null;
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlements/${month}/${year}`);
      if (res) {
        await cacheService.set(cacheKey, res);
      }
      return res || null;
    } catch {
      return cached || null;
    }
  },

  /** Get expenses included in a specific monthly settlement */
  async getMonthlySettlementExpenses(groupId: string, month: number, year: number): Promise<SettlementExpense[]> {
    const cacheKey = `${CACHE_KEYS.GROUP_SETTLEMENT(groupId, month, year)}:expenses`;
    const cached = await cacheService.get<SettlementExpense[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlements/${month}/${year}/expenses`);
      const expenses = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, expenses);
      return expenses;
    } catch {
      return hasCached ? cached! : [];
    }
  },

  /** Get member finalization statuses for a settlement */
  async getMemberMonthlyStatus(groupId: string, settlementId: string): Promise<MemberMonthlyStatus[]> {
    const cacheKey = `cache:group_settlement_status:${groupId}:${settlementId}`;
    const cached = await cacheService.get<MemberMonthlyStatus[]>(cacheKey);
    const hasCached = Array.isArray(cached);

    if (!networkService.isOnline()) {
      return hasCached ? cached! : [];
    }

    try {
      const res: any = await apiClient.get(`/api/v1/groups/${groupId}/settlements/${settlementId}/member-status`);
      const statuses = Array.isArray(res) ? res : [];
      await cacheService.set(cacheKey, statuses);
      return statuses;
    } catch {
      return hasCached ? cached! : [];
    }
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
