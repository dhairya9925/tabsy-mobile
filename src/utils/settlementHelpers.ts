import { colors } from '../theme';

export interface SettlementProgress {
  completedCount: number;
  totalMembers: number;
  percentage: number;
  isAllCompleted: boolean;
}

export function calculateSettlementProgress(
  totalMembers: number,
  completedCount: number
): SettlementProgress {
  if (totalMembers <= 0) {
    return {
      completedCount: 0,
      totalMembers: 0,
      percentage: 0,
      isAllCompleted: false,
    };
  }

  const clampedCompleted = Math.min(completedCount, totalMembers);
  const percentage = Math.round((clampedCompleted / totalMembers) * 100);

  return {
    completedCount: clampedCompleted,
    totalMembers,
    percentage,
    isAllCompleted: clampedCompleted >= totalMembers,
  };
}

/**
 * Finalization window logic matching web frontend:
 * Window is open from the last day of the selected month through the 7th of the following month.
 */
export function isFinalizeWindowOpen(
  month: number,
  year: number,
  currentDate: Date = new Date()
): boolean {
  // Last day of the selected month
  const lastDayOfMonth = new Date(year, month, 0, 0, 0, 0);
  // 7th of the subsequent month
  const seventhOfNextMonth = new Date(year, month, 7, 23, 59, 59, 999);

  return currentDate >= lastDayOfMonth && currentDate <= seventhOfNextMonth;
}

export interface SettlementStatusMeta {
  label: string;
  bgColor: string;
  textColor: string;
}

export function getSettlementStatusMeta(status?: string | null): SettlementStatusMeta {
  const norm = (status || 'open').toLowerCase();
  if (norm === 'locked') {
    return {
      label: 'Locked',
      bgColor: colors.clay,
      textColor: colors.negative,
    };
  }
  if (norm === 'finalized' || norm === 'completed') {
    return {
      label: 'Finalized',
      bgColor: colors.soft,
      textColor: colors.accent,
    };
  }
  return {
    label: 'Open',
    bgColor: colors.soft,
    textColor: colors.accent,
  };
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getMonthName(month: number): string {
  if (month < 1 || month > 12) return 'Unknown';
  return MONTH_NAMES[month - 1];
}
