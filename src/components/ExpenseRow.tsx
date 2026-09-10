import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { PersonalExpense } from '../types';
import { formatCurrencyExact, formatDate } from '../utils/formatters';
import {
  Utensils,
  Plane,
  ShoppingBag,
  Receipt,
  Car,
  Film,
  Sparkles,
  HelpCircle,
} from 'lucide-react-native';

export interface ExpenseRowProps {
  expense: PersonalExpense;
  onPress?: () => void;
}

export function getCategoryIcon(name?: string | null) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('food') || lower.includes('dining') || lower.includes('restaurant')) {
    return <Utensils size={18} color={colors.accent} />;
  }
  if (lower.includes('travel') || lower.includes('flight') || lower.includes('trip')) {
    return <Plane size={18} color={colors.accent} />;
  }
  if (lower.includes('shop') || lower.includes('grocer') || lower.includes('store')) {
    return <ShoppingBag size={18} color={colors.accent} />;
  }
  if (lower.includes('bill') || lower.includes('util') || lower.includes('rent')) {
    return <Receipt size={18} color={colors.accent} />;
  }
  if (lower.includes('transport') || lower.includes('cab') || lower.includes('fuel')) {
    return <Car size={18} color={colors.accent} />;
  }
  if (lower.includes('entertain') || lower.includes('movie')) {
    return <Film size={18} color={colors.accent} />;
  }
  return <Sparkles size={18} color={colors.accent} />;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, onPress }) => {
  const categoryName = expense.category?.name || 'Personal Expense';
  const icon = getCategoryIcon(categoryName);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={!onPress}
      style={styles.container}
    >
      <View style={styles.iconCircle}>{icon}</View>

      <View style={styles.infoCol}>
        <SproutText variant="subtitle" color={colors.text} numberOfLines={1}>
          {expense.description || categoryName}
        </SproutText>
        <SproutText variant="caption" color={colors.muted}>
          {categoryName} • {formatDate(expense.date)}
        </SproutText>
      </View>

      <View style={styles.amountCol}>
        <SproutText variant="amountRow" color={colors.negative}>
          -{formatCurrencyExact(expense.amount)}
        </SproutText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
});
