import type { StreakDay } from '../types/index';

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  if (isNaN(num)) return '₹0';
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

export function formatCurrencyExact(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatMonthYear(dateString?: string): string {
  const d = dateString ? new Date(dateString) : new Date();
  return d.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();
}

export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'ST';
}

/**
 * Returns current week (Monday to Sunday) streak items.
 * @param loggedDates Array of 'YYYY-MM-DD' dates where user logged or paid expenses
 */
export function getCurrentWeekDays(loggedDates: string[] = []): StreakDay[] {
  const loggedSet = new Set(loggedDates);
  const now = new Date();
  
  // Calculate current Monday
  const day = now.getDay();
  // In JS, 0 is Sunday. Convert to Monday=0 .. Sunday=6
  const diffToMonday = (day + 6) % 7;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const week: StreakDay[] = [];

  const todayStr = toLocalDateString(now);

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = toLocalDateString(current);
    const isToday = dateStr === todayStr;
    const isFuture = current.getTime() > now.getTime() && !isToday;
    const isDone = loggedSet.has(dateStr);

    week.push({
      dayName: dayNames[i],
      dateString: dateStr,
      dayNumber: current.getDate(),
      isDone,
      isToday,
      isFuture,
    });
  }

  return week;
}

export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
