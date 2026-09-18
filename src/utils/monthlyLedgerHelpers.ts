import {
  GroupMember,
  SettlementExpense,
  MemberMonthlyStatus,
  MonthlySettlement,
  MonthlyLedgerResponse,
  MemberLedgerItem,
  MonthlyLedgerSummary,
  UserLedgerActionSummary,
  CoordinatorChecklist,
  CoordinatorPendingCollection,
  CoordinatorPendingRefund,
} from '../types';

export interface BuildFallbackLedgerParams {
  groupId: string;
  groupName: string;
  month: number;
  year: number;
  members: GroupMember[];
  expenses: SettlementExpense[];
  memberStatuses: MemberMonthlyStatus[];
  settlement: MonthlySettlement | null;
  currentUserId?: string;
}

/**
 * Builds a synthetically computed MonthlyLedgerResponse from local group members,
 * settlement status, and expenses. Used as a fallback when the remote backend
 * endpoint (/groups/{id}/monthly-ledger) is not yet supported or returns 404,
 * ensuring the UI renders the exact same HeroActionSlipCard and MonthlyLedgerTable.
 */
export function buildFallbackLedger({
  groupId,
  groupName,
  month,
  year,
  members,
  expenses,
  memberStatuses,
  settlement,
  currentUserId,
}: BuildFallbackLedgerParams): MonthlyLedgerResponse | null {
  if (!members || members.length === 0) {
    return null;
  }

  // 1. Calculate totals from expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const memberCount = members.length;
  const equalExpenseShare = memberCount > 0 ? Math.round((totalExpenses / memberCount) * 100) / 100 : 0;

  // Find coordinator (first admin or first member)
  const coordinatorMember =
    members.find((m) => m.role === 'admin' || m.role === 'coordinator') || members[0];
  const coordinatorName =
    coordinatorMember?.profile?.display_name || coordinatorMember?.profile?.email || 'Coordinator';

  // 2. Build MemberLedgerItem for each member
  const ledgerMembers: MemberLedgerItem[] = members.map((m) => {
    const isCompleted = memberStatuses.some((s) => s.user_id === m.user_id && s.is_completed);

    // Total fronted by this member in this period's expenses
    const fronted = expenses
      .filter(
        (e) =>
          (e.paid_by && e.paid_by === m.user_id) ||
          (e.payer_name &&
            e.payer_name.toLowerCase() ===
              (m.profile?.display_name || m.profile?.email || '').toLowerCase())
      )
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const expenseShare = equalExpenseShare;
    const rentShare = 0;
    const adjustments = 0;
    const totalExpense = rentShare + expenseShare + adjustments;
    const balance = Math.round((totalExpense - fronted) * 100) / 100;

    let status = 'pending';
    if (isCompleted) {
      status = 'confirmed';
    } else if (balance <= 0) {
      status = 'confirmed';
    }

    return {
      user_id: m.user_id,
      display_name: m.profile?.display_name || m.profile?.email || 'Member',
      email: m.profile?.email || null,
      avatar_url: m.profile?.avatar_url || null,
      role: m.role || 'member',
      is_excluded: false,
      rent_share: rentShare,
      expense_share: expenseShare,
      adjustments: adjustments,
      total_expense: totalExpense,
      total_paid: fronted,
      balance: balance,
      status: status,
    };
  });

  // 3. Totals and summary calculations
  const totalPaid = ledgerMembers.reduce((sum, m) => sum + m.total_paid, 0);
  const membersToContribute = ledgerMembers
    .filter((m) => m.balance > 0)
    .reduce((sum, m) => sum + m.balance, 0);
  const overContributed = ledgerMembers
    .filter((m) => m.balance < 0)
    .reduce((sum, m) => sum + Math.abs(m.balance), 0);

  const completedCount = memberStatuses.filter((s) => s.is_completed).length;
  const collectionProgressPct = memberCount > 0 ? Math.round((completedCount / memberCount) * 100) : 0;

  const summary: MonthlyLedgerSummary = {
    total_rent: 0,
    total_shared_expenses: totalExpenses,
    total_adjustments: 0,
    grand_total: totalExpenses,
    total_paid: totalPaid,
    total_balance: membersToContribute,
    members_to_contribute: membersToContribute,
    over_contributed: overContributed,
    remaining_for_bills: 0,
    collection_progress_pct: collectionProgressPct,
    bill_progress_pct: 100,
    total_disbursed: 0,
    total_vendor_bills_paid: 0,
    total_refunds_paid: 0,
  };

  // 4. Current user summary
  const myItem = ledgerMembers.find((m) => m.user_id === currentUserId);
  let mySummary: UserLedgerActionSummary | null = null;
  if (myItem) {
    const action =
      myItem.balance > 0 ? 'pay_coordinator' : myItem.balance < 0 ? 'receive_refund' : 'settled';
    const amount = Math.abs(myItem.balance);

    mySummary = {
      action,
      amount,
      coordinator_name: coordinatorName,
      coordinator_id: coordinatorMember?.user_id,
      coordinator_upi_id: null,
      status: myItem.status,
      upi_uri: null,
      breakdown: {
        rent_share: 0,
        expense_share: myItem.expense_share,
        adjustments: 0,
        total_obligation: myItem.total_expense,
        already_paid: myItem.total_paid,
      },
    };
  }

  // 5. Coordinator checklist
  const membersToCollect: CoordinatorPendingCollection[] = ledgerMembers
    .filter((m) => m.balance > 0)
    .map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      amount: m.balance,
      status: m.status,
    }));

  const membersToRefund: CoordinatorPendingRefund[] = ledgerMembers
    .filter((m) => m.balance < 0)
    .map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      amount: Math.abs(m.balance),
      refunded_amount: 0,
      remaining_refund: Math.abs(m.balance),
      status: m.status,
    }));

  const coordinatorSummary: CoordinatorChecklist = {
    members_to_collect: membersToCollect,
    total_to_collect: membersToCollect.reduce((sum, m) => sum + m.amount, 0),
    members_to_refund: membersToRefund,
    total_to_refund: membersToRefund.reduce((sum, m) => sum + m.amount, 0),
    net_cash_for_bills: 0,
    external_bills_pending: [],
    total_external_bills_pending: 0,
  };

  return {
    group_id: groupId,
    group_name: groupName,
    month,
    year,
    settlement_id: settlement?.id || null,
    settlement_status: settlement?.status === 'locked' ? 'locked' : 'open',
    summary,
    members: ledgerMembers,
    my_summary: mySummary,
    coordinator_summary: coordinatorSummary,
    disbursements: [],
  };
}
