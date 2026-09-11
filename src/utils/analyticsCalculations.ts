import {
  PersonalExpense,
  GroupUserSplitItem,
  CategorySlice,
  MonthlyTrendPoint,
  WeeklyRhythmDay,
} from '../types';
import { chartColors } from '../theme';
import { roundMoney } from './money';

export const CATEGORY_PALETTE: Record<string, string> = {
  food: chartColors.food,
  'food & dining': chartColors.food,
  transport: chartColors.transport,
  travel: chartColors.transport,
  shopping: chartColors.shopping,
  bills: chartColors.bills,
  'bills & utilities': chartColors.bills,
  entertainment: chartColors.entertainment,
  other: chartColors.other,
};

export const CHART_PALETTE_FALLBACK = [
  chartColors.food,
  chartColors.transport,
  chartColors.shopping,
  chartColors.bills,
  chartColors.entertainment,
  chartColors.personal,
  chartColors.groupShare,
  chartColors.other,
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(categoryId: string, _index?: number): string {
  const normalized = categoryId.toLowerCase().trim();
  if (CATEGORY_PALETTE[normalized]) {
    return CATEGORY_PALETTE[normalized];
  }
  const hash = hashString(normalized);
  return CHART_PALETTE_FALLBACK[hash % CHART_PALETTE_FALLBACK.length];
}


export function prettifyCategoryLabel(categoryId: string): string {
  const normalized = categoryId.toLowerCase().trim();
  if (normalized === 'food' || normalized === 'food & dining') return 'Food & Dining';
  if (normalized === 'transport') return 'Transport';
  if (normalized === 'travel') return 'Travel';
  if (normalized === 'shopping') return 'Shopping';
  if (normalized === 'bills' || normalized === 'bills & utilities') return 'Bills & Utilities';
  if (normalized === 'entertainment') return 'Entertainment';
  if (normalized === 'other') return 'Other';
  return categoryId
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Computes category breakdown for a specific month (defaults to current month YYYY-MM).
 */
export function computeCategoryBreakdown(
  personalExpenses: PersonalExpense[] = [],
  groupUserSplits: GroupUserSplitItem[] = [],
  mode: 'all' | 'personal' = 'all',
  monthStr?: string
): { slices: CategorySlice[]; total: number } {
  const targetMonth = monthStr || new Date().toISOString().slice(0, 7);
  const categoryMap = new Map<string, number>();

  // 1. Personal expenses
  personalExpenses.forEach((exp) => {
    const d = exp.expense_date || exp.date || '';
    if (d.startsWith(targetMonth)) {
      const cat = (typeof exp.category === 'string' ? exp.category : (exp.category as any)?.name) || 'other';
      const normCat = cat.toLowerCase().trim();
      const current = categoryMap.get(normCat) || 0;
      categoryMap.set(normCat, current + Number(exp.amount || 0));
    }
  });

  // 2. Group splits (when mode is 'all')
  if (mode === 'all') {
    groupUserSplits.forEach((split) => {
      const d = split.expense_date || '';
      if (d.startsWith(targetMonth)) {
        const normCat = (split.category || 'other').toLowerCase().trim();
        const current = categoryMap.get(normCat) || 0;
        categoryMap.set(normCat, current + Number(split.amount || 0));
      }
    });
  }

  const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

  const slices: CategorySlice[] = Array.from(categoryMap.entries())
    .map(([cat, amount], idx) => {
      const roundedAmount = roundMoney(amount);
      const percentage = total > 0 ? Math.round((roundedAmount / total) * 100) : 0;
      return {
        categoryId: cat,
        name: prettifyCategoryLabel(cat),
        value: roundedAmount,
        percentage,
        color: getCategoryColor(cat, idx),
      };
    })
    .sort((a, b) => b.value - a.value);

  return { slices, total: roundMoney(total) };
}

/**
 * Computes 6-month stacked spending trend (Personal vs Group Share).
 */
export function computeSixMonthTrend(
  personalExpenses: PersonalExpense[] = [],
  groupUserSplits: GroupUserSplitItem[] = [],
  referenceDate: Date = new Date()
): MonthlyTrendPoint[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const points: MonthlyTrendPoint[] = [];

  // Generate 6 months chronologically ending at referenceDate
  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    const shortYear = String(year).slice(-2);
    const label = `${monthNames[d.getMonth()]} '${shortYear}`;

    points.push({
      key,
      label,
      personal: 0,
      groupShare: 0,
      total: 0,
    });
  }

  const pointMap = new Map(points.map((p) => [p.key, p]));

  personalExpenses.forEach((exp) => {
    const d = exp.expense_date || exp.date || '';
    const key = d.slice(0, 7);
    const item = pointMap.get(key);
    if (item) {
      item.personal += Number(exp.amount || 0);
    }
  });

  groupUserSplits.forEach((split) => {
    const d = split.expense_date || '';
    const key = d.slice(0, 7);
    const item = pointMap.get(key);
    if (item) {
      item.groupShare += Number(split.amount || 0);
    }
  });

  return points.map((p) => ({
    ...p,
    personal: roundMoney(p.personal),
    groupShare: roundMoney(p.groupShare),
    total: roundMoney(p.personal + p.groupShare),
  }));
}

/**
 * Computes 7-day spending rhythm for the current calendar week (Monday to Sunday).
 */
export function computeWeeklyRhythm(
  personalExpenses: PersonalExpense[] = [],
  referenceDate: Date = new Date()
): {
  days: WeeklyRhythmDay[];
  daysLogged: number;
  maxDayAmount: number;
  weekTotal: number;
} {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // Find Monday of the current week (ISO week: Monday = 1, Sunday = 7)
  const currentDayOfWeek = referenceDate.getDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = (currentDayOfWeek + 6) % 7;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - distanceToMonday);

  const refDateStr = referenceDate.toISOString().slice(0, 10);
  const days: WeeklyRhythmDay[] = [];
  let daysLogged = 0;
  let weekTotal = 0;
  let maxDayAmount = 0;

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = dayDate.toISOString().slice(0, 10);

    // Sum expenses for this day
    const dayExpenses = personalExpenses.filter((exp) => {
      const d = exp.expense_date || exp.date || '';
      return d.slice(0, 10) === dateStr;
    });

    const amount = roundMoney(
      dayExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
    );

    const hasActivity = amount > 0;
    if (hasActivity) daysLogged++;
    weekTotal += amount;
    if (amount > maxDayAmount) maxDayAmount = amount;

    days.push({
      dayKey: dayKeys[i],
      dayLabel: dayLabels[i],
      dateStr,
      amount,
      isToday: dateStr === refDateStr,
      hasActivity,
    });
  }

  return {
    days,
    daysLogged,
    maxDayAmount: roundMoney(maxDayAmount),
    weekTotal: roundMoney(weekTotal),
  };
}

/**
 * Computes Month-over-Month percentage and trend text.
 */
export function computeMonthComparison(
  currentTotal: number,
  prevTotal: number
): {
  pct: number;
  trend: 'less' | 'more' | 'same';
  label: string;
} {
  if (prevTotal <= 0) {
    if (currentTotal <= 0) {
      return { pct: 0, trend: 'same', label: 'same as last month' };
    }
    return { pct: 100, trend: 'more', label: '100% more than last month' };
  }

  const diff = currentTotal - prevTotal;
  const pct = Math.round(Math.abs(diff / prevTotal) * 100);

  if (diff < -0.01) {
    return { pct, trend: 'less', label: `${pct}% less than last month` };
  }
  if (diff > 0.01) {
    return { pct, trend: 'more', label: `${pct}% more than last month` };
  }
  return { pct: 0, trend: 'same', label: 'same as last month' };
}
