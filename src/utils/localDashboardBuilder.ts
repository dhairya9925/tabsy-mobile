import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import {
  DashboardData,
  PersonalExpense,
  Group,
  FriendBalance,
  GroupBalanceSummary,
  DashboardFriendBalance,
  DashboardActivityItem,
} from '../types';
import { roundMoney } from './money';

/**
 * Constructs a fallback DashboardData structure using solely local cached data
 * (personal expenses, groups, friend balances, and group balances).
 * This ensures the analytics and rhythm screens can operate completely offline.
 */
export async function buildDashboardFromLocalCache(): Promise<DashboardData> {
  const [personalExpenses, groups, friendBalances, groupBalances, groupMemberCounts] =
    await Promise.all([
      cacheService.get<PersonalExpense[]>(CACHE_KEYS.PERSONAL_EXPENSES),
      cacheService.get<Group[]>(CACHE_KEYS.GROUPS_LIST),
      cacheService.get<FriendBalance[]>(CACHE_KEYS.FRIEND_BALANCES),
      cacheService.get<Record<string, number>>(CACHE_KEYS.GROUP_BALANCES),
      cacheService.get<Record<string, number>>(CACHE_KEYS.GROUP_MEMBER_COUNTS),
    ]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const prevMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const allExpenses: PersonalExpense[] = Array.isArray(personalExpenses) ? personalExpenses : [];
  const currentMonthExpenses = allExpenses.filter((e) =>
    (e.expense_date || e.date || '').startsWith(currentMonth)
  );
  const prevMonthExpenses = allExpenses.filter((e) =>
    (e.expense_date || e.date || '').startsWith(prevMonth)
  );

  const personalTotal = roundMoney(
    currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  );
  const personalPrevMonthTotal = roundMoney(
    prevMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  );
  const personalExpenseCount = currentMonthExpenses.length;

  // Groups and group balance summaries
  const allGroups: Group[] = Array.isArray(groups) ? groups : [];
  const groupBalanceSummaries: GroupBalanceSummary[] = allGroups.map((g) => ({
    groupId: g.id,
    groupName: g.name,
    groupType: g.type,
    memberCount: groupMemberCounts?.[g.id] ?? 1,
    userNetBalance: groupBalances?.[g.id] ?? 0,
  }));

  // Friend balances
  const allFriendBalances: FriendBalance[] = Array.isArray(friendBalances) ? friendBalances : [];
  const dashboardFriendBalances: DashboardFriendBalance[] = allFriendBalances.map((fb) => ({
    friendId: fb.friendId || (fb as any).friend_id || '',
    netBalance: roundMoney(Number(fb.netBalance ?? (fb as any).net_balance ?? 0)),
    friendName: (fb as any).friendName || (fb as any).name || null,
  }));

  // Net debt calculations
  let netOwed = 0;
  let netOwes = 0;
  let unsettledCount = 0;

  dashboardFriendBalances.forEach((fb) => {
    if (fb.netBalance > 0.01) {
      netOwed += fb.netBalance;
      unsettledCount++;
    } else if (fb.netBalance < -0.01) {
      netOwes += Math.abs(fb.netBalance);
      unsettledCount++;
    }
  });

  groupBalanceSummaries.forEach((gb) => {
    if (gb.userNetBalance > 0.01) {
      netOwed += gb.userNetBalance;
      unsettledCount++;
    } else if (gb.userNetBalance < -0.01) {
      netOwes += Math.abs(gb.userNetBalance);
      unsettledCount++;
    }
  });

  netOwed = roundMoney(netOwed);
  netOwes = roundMoney(netOwes);
  const netBalance = roundMoney(netOwed - netOwes);

  // Group share totals (fallback to 0 if individual group splits are not loaded)
  const groupShareTotal = 0;
  const groupSharePrevMonthTotal = 0;

  const unifiedTotal = roundMoney(personalTotal + groupShareTotal);
  const unifiedPrevMonthTotal = roundMoney(personalPrevMonthTotal + groupSharePrevMonthTotal);
  const monthOverMonthPct =
    unifiedPrevMonthTotal > 0
      ? roundMoney(((unifiedTotal - unifiedPrevMonthTotal) / unifiedPrevMonthTotal) * 100)
      : null;

  // Recent activity from sorted personal expenses
  const sortedExpenses = [...allExpenses].sort((a, b) => {
    const da = a.expense_date || a.date || a.created_at || '';
    const db = b.expense_date || b.date || b.created_at || '';
    return db.localeCompare(da);
  });

  const recentActivity: DashboardActivityItem[] = sortedExpenses.slice(0, 10).map((e) => ({
    id: e.id,
    type: 'personal_expense',
    title: e.note || e.description || e.category || 'Expense',
    subText: e.category || 'Personal',
    amount: roundMoney(Number(e.amount || 0)),
    date: e.expense_date || e.date || e.created_at || '',
    category: e.category || 'other',
    link: `/journal/${e.id}`,
  }));

  const lastExpenseDate =
    sortedExpenses.length > 0
      ? sortedExpenses[0].expense_date ||
        sortedExpenses[0].date ||
        sortedExpenses[0].created_at ||
        null
      : null;

  return {
    personalTotal,
    personalPrevMonthTotal,
    personalExpenseCount,
    personalExpenses: allExpenses,
    groups: allGroups,
    groupShareTotal,
    groupSharePrevMonthTotal,
    groupBalances: groupBalanceSummaries,
    groupUserSplits: [],
    friendBalances: dashboardFriendBalances,
    unifiedTotal,
    unifiedPrevMonthTotal,
    monthOverMonthPct,
    netOwed,
    netOwes,
    netBalance,
    unsettledCount,
    monthlyTransactionCount: personalExpenseCount,
    recentActivity,
    lastExpenseDate,
  };
}
