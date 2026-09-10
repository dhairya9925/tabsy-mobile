export interface ResponseEnvelope<T = any> {
  data: T | null;
  error: string | null;
  meta?: Record<string, any> | null;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_shadow: boolean;
  created_at: string;
  updated_at: string;
  shadow_created_by?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  slug?: string;
  color_index?: number;
  icon?: string | null;
  color?: string | null;
  is_default?: boolean;
}

export interface CategoryCreate {
  name: string;
}

export interface CategoryUpdate {
  name?: string;
  color_index?: number;
}

export interface PersonalExpense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note?: string | null;
  description?: string | null; // UI helper alias for note
  expense_date: string; // 'YYYY-MM-DD'
  date?: string; // UI helper alias for expense_date
  created_at: string;
  updated_at: string;
}

export interface PersonalExpenseCreate {
  amount: number;
  category: string;
  note?: string | null;
  expense_date: string; // 'YYYY-MM-DD'
  description?: string; // fallback alias
  date?: string; // fallback alias
}

export interface PersonalExpenseUpdate {
  amount?: number;
  category?: string;
  note?: string | null;
  expense_date?: string;
}

export interface DashboardSummary {
  total_spent?: number;
  monthly_spent?: number;
  weekly_spent?: number;
  net_balance?: number;
  to_receive?: number;
  to_pay?: number;
  recent_expenses?: PersonalExpense[];
}

export interface StreakDay {
  dayName: string; // 'M', 'T', 'W', etc.
  dateString: string; // 'YYYY-MM-DD'
  dayNumber: number; // 1..31
  isDone: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export type GroupTypeKey = 'shared_living' | 'trip' | 'day_to_day' | 'event' | 'reimbursable';

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  type: GroupTypeKey | string;
  monthly_rent?: number | null;
  sponsor_id?: string | null;
}

export interface GroupCreate {
  name: string;
  description?: string | null;
  type?: string;
  monthly_rent?: number | null;
  sponsor_id?: string | null;
}

export interface GroupUpdate {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  monthly_rent?: number | null;
  sponsor_id?: string | null;
}

export interface MemberProfile {
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  is_shadow?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member' | string;
  joined_at: string;
  profile?: MemberProfile | null;
}

export interface GroupMemberAdd {
  user_id?: string;
  email?: string;
  role?: 'admin' | 'member';
}

export interface GroupExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  created_at: string;
  member_name?: string | null;
}

export interface GroupExpenseSplitWrite {
  user_id: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  amount: number;
  category: string;
  note?: string | null;
  expense_date: string;
  user_id: string;
  group_id?: string | null;
  paid_by?: string | null;
  status: 'submitted' | 'approved' | 'reimbursed' | string;
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  payer_name?: string | null;
  splits: GroupExpenseSplit[];
}

export interface GroupExpenseCreate {
  amount: number;
  category: string;
  note?: string | null;
  expense_date?: string;
  paid_by?: string;
  status?: 'submitted' | 'approved' | 'reimbursed';
  receipt_url?: string | null;
  splits: GroupExpenseSplitWrite[];
}

export interface GroupExpenseUpdate {
  amount?: number;
  category?: string;
  note?: string | null;
  expense_date?: string;
  paid_by?: string;
  status?: 'submitted' | 'approved' | 'reimbursed';
  receipt_url?: string | null;
  splits?: GroupExpenseSplitWrite[];
}

export interface GroupBalance {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

export interface GroupSettleUpRequest {
  from_user_id: string;
  to_user_id: string;
}

// ==============================================================================
// Friend & 1-on-1 Expense Types (Phase 4)
// ==============================================================================

export type FriendStatus = 'pending' | 'accepted' | 'rejected' | 'sent';

export interface FriendProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  is_shadow: boolean;
}

export interface FriendRecord {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
  profile?: FriendProfile | null;
}

export interface FriendBalance {
  friendId: string;
  netBalance: number; // Positive = friend owes user, Negative = user owes friend
}

export interface FriendExpenseSplit {
  user_id: string;
  amount: number;
  is_settled: boolean;
}

export interface FriendExpenseFeedItem {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  expense_date: string;
  paid_by: string;
  created_at: string;
  edited_at: string | null;
  expense_splits: FriendExpenseSplit[];
}

export interface FriendExpenseCreate {
  amount: number;
  category: string;
  note?: string;
  expense_date: string;
  paid_by: string;
  split_type: 'equal' | 'full';
}

export interface FriendExpenseUpdate {
  amount?: number;
  category?: string;
  note?: string;
  expense_date?: string;
  paid_by?: string;
  split_type?: 'equal' | 'full';
}

export interface ProfileSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CreateShadowProfileRequest {
  display_name: string;
  email: string;
}

export interface CreateShadowProfileResponse {
  profile: FriendProfile;
  shadow_user_id: string;
}

// ==============================================================================
// Dashboard & Analytics Types (Phase 5)
// ==============================================================================

export interface GroupBalanceSummary {
  groupId: string;
  groupName: string;
  groupType: string;
  memberCount: number;
  userNetBalance: number;
}

export interface GroupUserSplitItem {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  group_id: string;
}

export interface DashboardActivityItem {
  id: string;
  type: 'personal_expense' | 'group_expense' | 'settlement' | string;
  title: string;
  subText: string;
  amount: number;
  date: string;
  category: string;
  link: string;
}

export interface DashboardFriendBalance {
  friendId: string;
  netBalance: number;
  friendName?: string | null;
}

export interface DashboardData {
  // Personal
  personalTotal: number;
  personalPrevMonthTotal: number;
  personalExpenseCount: number;
  personalExpenses: PersonalExpense[];

  // Groups
  groups: Group[];
  groupShareTotal: number;
  groupSharePrevMonthTotal: number;
  groupBalances: GroupBalanceSummary[];
  groupUserSplits: GroupUserSplitItem[];

  // Friends
  friendBalances: DashboardFriendBalance[];

  // Unified totals
  unifiedTotal: number;
  unifiedPrevMonthTotal: number;
  monthOverMonthPct: number | null;

  // Debt totals
  netOwed: number;
  netOwes: number;
  netBalance: number;
  unsettledCount: number;

  // Activity
  monthlyTransactionCount: number;
  recentActivity: DashboardActivityItem[];
  lastExpenseDate: string | null;
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface MonthlyTrendPoint {
  key: string;
  label: string;
  personal: number;
  groupShare: number;
  total: number;
}

export interface WeeklyRhythmDay {
  dayKey: string;
  dayLabel: string;
  dateStr: string;
  amount: number;
  isToday: boolean;
  hasActivity: boolean;
}

// ==============================================================================
// Profile & Settlement Types (Phase 6)
// ==============================================================================

export interface ProfileUpdatePayload {
  display_name?: string | null;
  avatar_url?: string | null;
}

export type MonthlySettlementStatus = 'open' | 'locked' | 'finalized';

export interface MonthlySettlement {
  id: string;
  group_id: string;
  month: number;
  year: number;
  status: MonthlySettlementStatus;
  created_at: string;
  updated_at: string;
}

export interface MemberMonthlyStatus {
  id: string;
  settlement_id: string;
  user_id: string;
  is_completed: boolean;
  completed_at?: string | null;
  profile?: MemberProfile | null;
}

export interface SettlementExpense {
  id: string;
  amount: number;
  category: string;
  note?: string | null;
  expense_date: string;
  payer_name?: string | null;
  paid_by?: string | null;
}
