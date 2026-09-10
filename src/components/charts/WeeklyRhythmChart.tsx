import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WeeklyRhythmDay } from '../../types';
import { colors, radii, spacing } from '../../theme';
import { SproutText } from '../SproutText';
import { formatCurrency } from '../../utils/formatters';
import { Check } from 'lucide-react-native';

interface WeeklyRhythmChartProps {
  days: WeeklyRhythmDay[];
  daysLogged: number;
  maxDayAmount: number;
}

export const WeeklyRhythmChart: React.FC<WeeklyRhythmChartProps> = ({
  days,
  daysLogged,
  maxDayAmount,
}) => {
  const maxBarHeight = 64;
  const minBarHeight = 10;
  const effectiveMax = Math.max(maxDayAmount, 100);

  return (
    <View style={styles.container}>
      {/* Rhythm Header / Badge */}
      <View style={styles.headerRow}>
        <View style={styles.badgeContainer}>
          <View style={styles.checkCircle}>
            <Check size={11} color={colors.surface} strokeWidth={2.5} />
          </View>
          <SproutText variant="caption" color={colors.text} style={styles.badgeText}>
            {daysLogged} of 7 days logged this week
          </SproutText>
        </View>
      </View>

      {/* 7-Day Capsule Columns */}
      <View style={styles.daysRow}>
        {days.map((day) => {
          const ratio = effectiveMax > 0 ? day.amount / effectiveMax : 0;
          const barHeight = day.hasActivity
            ? Math.max(minBarHeight, Math.round(ratio * maxBarHeight))
            : minBarHeight;

          return (
            <View key={day.dayKey} style={styles.dayCol}>
              {/* Bar track container */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barPill,
                    {
                      height: barHeight,
                      backgroundColor: day.hasActivity
                        ? day.isToday
                          ? colors.accent
                          : colors.soft
                        : colors.line,
                    },
                  ]}
                />
              </View>

              {/* Day Label */}
              <View
                style={[
                  styles.dayLabelCircle,
                  day.isToday && styles.todayCircle,
                ]}
              >
                <SproutText
                  variant="caption"
                  color={day.isToday ? colors.accent : colors.text}
                  style={day.isToday ? styles.todayLabel : undefined}
                >
                  {day.dayLabel}
                </SproutText>
              </View>

              {/* Amount or Dash */}
              <SproutText
                variant="monoSm"
                color={day.hasActivity ? colors.text : colors.muted}
                style={styles.amountText}
              >
                {day.hasActivity ? `₹${Math.round(day.amount)}` : '—'}
              </SproutText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.soft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 70,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  barPill: {
    width: 14,
    borderRadius: radii.full,
  },
  dayLabelCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  todayCircle: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  todayLabel: {
    fontWeight: '700',
  },
  amountText: {
    fontSize: 9,
    marginTop: 2,
  },
});
