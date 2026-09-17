import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, fontFamilies } from '../theme';
import { SproutText } from './SproutText';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface MonthSelectorCapsuleProps {
  month: number; // 1-12
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthPress?: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MonthSelectorCapsule: React.FC<MonthSelectorCapsuleProps> = ({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onMonthPress,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;

  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;

  return (
    <View style={[styles.wrapper, isDark && styles.wrapperDark]}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={onPrevMonth}
        activeOpacity={0.7}
        accessibilityLabel="Previous month"
      >
        <ChevronLeft size={18} color={isDark ? colors.surface : colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.centerButton}
        onPress={onMonthPress}
        activeOpacity={0.7}
        accessibilityLabel={`Selected month: ${monthName} ${year}`}
      >
        <Calendar size={14} color={colors.accent} style={{ marginRight: 6 }} />
        <SproutText
          style={[styles.monthText, isDark && styles.monthTextDark]}
          weight="700"
        >
          {monthName} {year}
        </SproutText>
        {isCurrentMonth && (
          <View style={styles.currentBadge}>
            <SproutText style={styles.currentBadgeText}>Now</SproutText>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={onNextMonth}
        activeOpacity={0.7}
        accessibilityLabel="Next month"
      >
        <ChevronRight size={18} color={isDark ? colors.surface : colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    marginVertical: spacing.sm,
    alignSelf: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  wrapperDark: {
    backgroundColor: '#1E2C24',
    borderColor: '#2D3F34',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  monthText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamilies.interface,
  },
  monthTextDark: {
    color: '#EFF5ED',
  },
  currentBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginLeft: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: fontFamilies.numeric,
    textTransform: 'uppercase',
  },
});
