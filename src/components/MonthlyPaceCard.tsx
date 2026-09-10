import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrency } from '../utils/formatters';

export interface MonthlyPaceCardProps {
  spent: number;
  budget: number;
  onPress?: () => void;
}

export const MonthlyPaceCard: React.FC<MonthlyPaceCardProps> = ({
  spent,
  budget,
  onPress,
}) => {
  const remaining = Math.max(0, budget - spent);
  const percentageUsed = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  const content = (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <SproutText variant="eyebrow" color={colors.sun} style={styles.eyebrow}>
          MONTHLY PACE
        </SproutText>
        <SproutText variant="heroPace" style={styles.amountLeft}>
          {formatCurrency(remaining)} left
        </SproutText>
        <SproutText variant="caption" color={colors.accentSoft} style={styles.subtitle}>
          {percentageUsed}% of plan used ({formatCurrency(spent)} spent)
        </SproutText>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <SproutText variant="caption" color={colors.text} weight="800" style={styles.ringText}>
              {percentageUsed}%
            </SproutText>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.text, // Deep forest green
    borderTopLeftRadius: 24,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  leftCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  eyebrow: {
    color: colors.sun,
    marginBottom: 4,
  },
  amountLeft: {
    marginBottom: 4,
    color: colors.surface,
  },
  subtitle: {
    color: colors.accentSoft,
  },
  rightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  ringInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: 13,
  },
});
