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
  name: string;
  icon?: string | null;
  color?: string | null;
  is_default?: boolean;
}

export interface PersonalExpense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category_id?: string | null;
  category?: Category | null;
  date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalExpenseCreate {
  amount: number;
  description: string;
  category_id?: string | null;
  date: string;
  notes?: string | null;
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
