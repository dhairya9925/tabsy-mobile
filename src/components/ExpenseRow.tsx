import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { fontFamilies, colors, spacing } from '../theme';
import { SproutText } from './SproutText';
import { PersonalExpense } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Coffee,
  Car,
  Utensils,
  ShoppingBag,
  ReceiptText,
  Sparkles,
  Clock,
  Film,
  MoreHorizontal,
} from 'lucide-react-native';

export interface ExpenseRowProps {
  expense: PersonalExpense;
  onPress?: () => void;
}

export function getCategoryIcon(name?: string | null, color?: string, size: number = 18) {
  const lower = (name || '').toLowerCase();
  const iconColor = color || colors.accent;
  if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('chai') || lower.includes('tea')) {
    return <Coffee size={size} color={iconColor} strokeWidth={1.7} />;
  }
  if (lower.includes('cab') || lower.includes('uber') || lower.includes('ola') || lower.includes('car') || lower.includes('travel') || lower.includes('transit') || lower.includes('transport')) {
    return <Car size={size} color={iconColor} strokeWidth={1.7} />;
  }
  if (lower.includes('food') || lower.includes('dining') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('restaurant') || lower.includes('sabji') || lower.includes('grocer')) {
    return <Utensils size={size} color={iconColor} strokeWidth={1.7} />;
  }
  if (lower.includes('shop') || lower.includes('store') || lower.includes('market') || lower.includes('cloth')) {
    return <ShoppingBag size={size} color={iconColor} strokeWidth={1.7} />;
  }
  if (lower.includes('bill') || lower.includes('util') || lower.includes('rent') || lower.includes('recharge') || lower.includes('electric') || lower.includes('wifi')) {
    return <ReceiptText size={size} color={iconColor} strokeWidth={1.7} />;
  }
  if (lower.includes('entertain') || lower.includes('movie') || lower.includes('cinema') || lower.includes('music') || lower.includes('game') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('fun')) {
    return <Film size={size} color={iconColor} strokeWidth={1.7} />;
  }
  if (lower.includes('other')) {
    return <MoreHorizontal size={size} color={iconColor} strokeWidth={1.7} />;
  }
  return <Sparkles size={size} color={iconColor} strokeWidth={1.7} />;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, onPress }) => {
  const categoryName = typeof expense.category === 'string'
    ? expense.category
    : (expense.category as any)?.name || 'Food';
  const icon = getCategoryIcon(categoryName);
  const rawDate = expense.date || expense.expense_date || '';
  
  // Format subtitle like "Today · Food" or "Yesterday · Travel"
  let datePart = 'Recent';
  if (rawDate) {
    const d = new Date(rawDate.split('T')[0]);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) datePart = 'Today';
    else if (isYesterday) datePart = 'Yesterday';
    else {
      datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.container, { borderBottomColor: colors.line }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>{icon}</View>

      <View style={styles.infoCol}>
        <SproutText style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {expense.description || expense.note || categoryName}
        </SproutText>
        <SproutText style={[styles.subtitle, { color: colors.muted }]}>
          {datePart} · {categoryName}
        </SproutText>
      </View>

      <View style={styles.amountCol}>
        <SproutText style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(expense.amount)}
        </SproutText>
        {expense.is_pending_sync && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.clay }]}>
            <Clock size={8.5} color="#7A3E2D" strokeWidth={2.4} style={{ marginRight: 2 }} />
            <SproutText style={[styles.pendingText, { color: '#7A3E2D' }]} weight="700">
              Pending
            </SproutText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 55,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconCircle: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.muted,
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  amount: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.text,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.clay,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  pendingText: {
    fontSize: 8.5,
    color: colors.negative,
  },
});

