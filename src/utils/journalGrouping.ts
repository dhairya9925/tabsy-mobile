import { PersonalExpense } from '../types';
import { toLocalDateString } from './formatters';

export interface DayGroup {
  dateKey: string;
  dateLabel: string;
  dayTotal: number;
  items: PersonalExpense[];
}

export interface MonthSection {
  monthKey: string;
  monthTitle: string;
  monthTag: string;
  isCurrentMonth: boolean;
  isPreviousMonth: boolean;
  totalSpent: number;
  expenseCount: number;
  topCategories: string[];
  dayGroups: DayGroup[];
}

export interface MonthFilterOption {
  key: string;
  label: string;
  count: number;
  total: number;
}

export function getMonthKeyFromDate(dateStr?: string | null): string {
  if (!dateStr) return 'other';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length >= 2 && parts[0].length === 4 && parts[1].length === 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return 'other';
}

export function formatMonthTitle(monthKey: string): string {
  if (monthKey === 'other') return 'Earlier Records';
  const [y, m] = monthKey.split('-').map((v) => parseInt(v, 10));
  if (isNaN(y) || isNaN(m)) return monthKey;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatMonthChipLabel(monthKey: string): string {
  if (monthKey === 'other') return 'Earlier';
  const [y, m] = monthKey.split('-').map((v) => parseInt(v, 10));
  if (isNaN(y) || isNaN(m)) return monthKey;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function extractAvailableMonths(expenses: PersonalExpense[]): MonthFilterOption[] {
  const monthMap = new Map<string, { key: string; label: string; count: number; total: number }>();

  for (const exp of expenses) {
    const key = getMonthKeyFromDate(exp.expense_date || exp.date || '');
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        label: formatMonthChipLabel(key),
        count: 0,
        total: 0,
      });
    }
    const entry = monthMap.get(key)!;
    entry.count += 1;
    entry.total += (exp.amount || 0);
  }

  return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export function groupExpensesByMonth(
  expenses: PersonalExpense[],
  referenceDate: Date = new Date()
): MonthSection[] {
  const sorted = [...expenses].sort((a, b) => {
    const da = (a.expense_date || a.date || '').split('T')[0];
    const db = (b.expense_date || b.date || '').split('T')[0];
    if (da !== db) return db.localeCompare(da);
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  const curYear = referenceDate.getFullYear();
  const curMonth = referenceDate.getMonth();
  const currentMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;

  const prevRefDate = new Date(curYear, curMonth - 1, 1);
  const previousMonthKey = `${prevRefDate.getFullYear()}-${String(prevRefDate.getMonth() + 1).padStart(2, '0')}`;

  const todayStr = toLocalDateString(referenceDate);
  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayDate);

  const sectionsMap = new Map<string, MonthSection>();
  const catTracker = new Map<string, Map<string, number>>();

  for (const exp of sorted) {
    const rawDate = exp.expense_date || exp.date || '';
    const dateKey = rawDate.split('T')[0] || 'Earlier';
    const mKey = getMonthKeyFromDate(dateKey);

    if (!sectionsMap.has(mKey)) {
      const isCur = mKey === currentMonthKey;
      const isPrev = mKey === previousMonthKey;
      const tag = isCur ? 'CURRENT MONTH' : isPrev ? 'PREVIOUS MONTH' : 'PAST RECORD';

      sectionsMap.set(mKey, {
        monthKey: mKey,
        monthTitle: formatMonthTitle(mKey),
        monthTag: tag,
        isCurrentMonth: isCur,
        isPreviousMonth: isPrev,
        totalSpent: 0,
        expenseCount: 0,
        topCategories: [],
        dayGroups: [],
      });
      catTracker.set(mKey, new Map());
    }

    const section = sectionsMap.get(mKey)!;
    section.totalSpent += (exp.amount || 0);
    section.expenseCount += 1;

    // Track category
    const catMap = catTracker.get(mKey)!;
    const catName = (exp.category || 'other').trim();
    catMap.set(catName, (catMap.get(catName) || 0) + 1);

    let dayGroup = section.dayGroups.find((g) => g.dateKey === dateKey);
    if (!dayGroup) {
      let label = dateKey;
      if (dateKey === todayStr) {
        label = 'TODAY';
      } else if (dateKey === yesterdayStr) {
        label = 'YESTERDAY';
      } else {
        const d = new Date(dateKey);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }).toUpperCase();
        }
      }

      dayGroup = {
        dateKey,
        dateLabel: label,
        dayTotal: 0,
        items: [],
      };
      section.dayGroups.push(dayGroup);
    }

    dayGroup.dayTotal += (exp.amount || 0);
    dayGroup.items.push(exp);
  }

  // Populate top categories
  sectionsMap.forEach((section, mKey) => {
    const catMap = catTracker.get(mKey);
    if (catMap) {
      section.topCategories = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
    }
  });

  return Array.from(sectionsMap.values());
}
