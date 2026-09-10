import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { StreakDay } from '../types';
import { Check } from 'lucide-react-native';

export interface StreakRowProps {
  days: StreakDay[];
}

export const StreakRow: React.FC<StreakRowProps> = ({ days }) => {
  return (
    <View style={styles.card}>
      {days.map((day, index) => {
        const isDone = day.isDone;
        const isToday = day.isToday;

        return (
          <View key={`${day.dateString}-${index}`} style={styles.dayCol}>
            <View
              style={[
                styles.bubble,
                isDone && styles.bubbleDone,
                isToday && !isDone && styles.bubbleToday,
                day.isFuture && styles.bubbleFuture,
              ]}
            >
              {isDone ? (
                <Check size={16} color={colors.onAccent} strokeWidth={3} />
              ) : (
                <SproutText
                  variant="caption"
                  color={isToday ? colors.accent : day.isFuture ? colors.muted : colors.text}
                  weight={isToday ? '800' : '600'}
                  style={styles.bubbleText}
                >
                  {day.dayNumber}
                </SproutText>
              )}
            </View>
            <SproutText
              variant="caption"
              color={isToday ? colors.accent : colors.muted}
              weight={isToday ? '800' : '600'}
              style={styles.dayLabel}
            >
              {day.dayName}
            </SproutText>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  bubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  bubbleDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  bubbleToday: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  bubbleFuture: {
    opacity: 0.5,
  },
  bubbleText: {
    fontSize: 12,
  },
  dayLabel: {
    fontSize: 11,
  },
});
