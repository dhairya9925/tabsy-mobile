import React from 'react';
import { View, StyleSheet } from 'react-native';
import { fontFamilies, colors, radii, spacing } from '../theme';
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
                <Check size={14} color={colors.onAccent} strokeWidth={2.6} />
              ) : (
                <SproutText
                  variant="caption"
                  color={isToday ? colors.accent : colors.text}
                  style={styles.bubbleText}
                >
                  {day.dayNumber}
                </SproutText>
              )}
            </View>
            <SproutText
              variant="caption"
              color={isToday ? colors.accent : colors.muted}
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
    paddingVertical: 13,
    paddingHorizontal: 10,
    marginBottom: spacing.md,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  bubble: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  bubbleToday: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  bubbleFuture: {
    opacity: 0.5,
  },
  bubbleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
  },
  dayLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    marginTop: 2,
  },
});
