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
