import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { FriendExpenseFeedItem } from '../types';
import { formatCurrencyExact, formatDate } from '../utils/formatters';
import {
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
} from 'lucide-react-native';

interface FriendExpenseRowProps {
  expense: FriendExpenseFeedItem;
  currentUserId?: string;
  friendName: string;
  onDelete?: () => void;
}

export const FriendExpenseRow: React.FC<FriendExpenseRowProps> = ({
  expense,
  currentUserId,
  friendName,
  onDelete,
}) => {
  const isPayment = expense.category.toLowerCase() === 'payment';
  const isPaidByMe = expense.paid_by === currentUserId;

  // Calculate my split vs their split
  const mySplit = expense.expense_splits.find((s) => s.user_id === currentUserId);
  const mySplitAmount = mySplit?.amount ?? (expense.amount / 2);

  // Net effect for current user:
  // If I paid: expense.amount - mySplitAmount (positive = lent to friend)
  // If friend paid: -mySplitAmount (negative = borrowed from friend)
  const netEffect = isPaidByMe ? (expense.amount - mySplitAmount) : -mySplitAmount;

  const getCategoryIcon = (category: string) => {
    if (isPayment) {
      return <CheckCircle2 size={18} color={colors.accent} />;
    }
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('dining')) {
      return <Utensils size={18} color={colors.accent} />;
    }
    if (cat.includes('travel') || cat.includes('transport')) {
      return <Car size={18} color={colors.accent} />;
    }
    if (cat.includes('shop')) {
      return <ShoppingBag size={18} color={colors.accent} />;
    }
    if (cat.includes('bill')) {
      return <Receipt size={18} color={colors.accent} />;
    }
    return <MoreHorizontal size={18} color={colors.accent} />;
  };

  const handleConfirmDelete = () => {
    Alert.alert(
      'Delete expense?',
      `This will permanently delete this ₹${expense.amount.toFixed(2)} expense. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const payerLabel = isPaidByMe ? 'You paid' : `${friendName} paid`;
  const formattedDate = formatDate(expense.expense_date);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>{getCategoryIcon(expense.category)}</View>

      <View style={styles.centerCol}>
        <SproutText variant="subtitle" color={colors.text} numberOfLines={1} style={styles.title}>
          {expense.note || expense.category}
        </SproutText>
        <SproutText variant="caption" color={colors.muted} numberOfLines={1}>
          {payerLabel} · {formattedDate}
        </SproutText>
      </View>

      <View style={styles.rightCol}>
        <SproutText
          variant="body"
          color={isPayment ? colors.text : netEffect >= 0 ? colors.accent : colors.negative}
          weight="700"
          style={styles.amountText}
        >
          {isPayment
            ? formatCurrencyExact(expense.amount)
            : netEffect >= 0
            ? `+${formatCurrencyExact(netEffect)}`
            : `-${formatCurrencyExact(Math.abs(netEffect))}`}
        </SproutText>

        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleConfirmDelete}
            style={styles.deleteBtn}
            accessibilityLabel="Delete expense"
          >
            <Trash2 size={14} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  centerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontFamily: 'JetBrainsMono',
  },
  deleteBtn: {
    padding: 4,
  },
});
