import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, spacing } from '../theme';
import { SproutText } from './SproutText';
import { GroupExpense } from '../types';
import { formatCurrency } from '../utils/formatters';
import { getCategoryIcon } from './ExpenseRow';

export interface GroupExpenseRowProps {
  expense: GroupExpense;
  currentUserId?: string;
  memberCount?: number;
  onPress?: () => void;
}

export const GroupExpenseRow: React.FC<GroupExpenseRowProps> = ({
  expense,
  currentUserId,
  memberCount,
  onPress,
}) => {
  const isPaidByMe = expense.paid_by === currentUserId || expense.user_id === currentUserId;
  const payer = expense.payer_name || (isPaidByMe ? 'You' : 'Member');
  const splitCount = expense.splits?.length || memberCount || 2;

  // Calculate current user's share if splits exist
  const mySplit = expense.splits?.find((s) => s.user_id === currentUserId);
  const myShareAmount = mySplit ? mySplit.amount : expense.amount / splitCount;

  // Format footnote under amount
  let footText = '';
  let footColor: string = colors.muted;
  if (isPaidByMe) {
    const lent = expense.amount - myShareAmount;
    if (lent > 0.01) {
      footText = `+${formatCurrency(lent)} lent`;
      footColor = colors.accent;
    } else {
      footText = 'You paid';
    }
  } else {
    footText = `${formatCurrency(myShareAmount)} your share`;
    footColor = colors.muted;
  }

  // Date formatting: "26 Aug" or "Today"
  const rawDate = expense.expense_date || '';
  let datePart = '';
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

  const subText = `${payer} paid · ${datePart ? `${datePart} · ` : ''}${splitCount} shares`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={styles.container}
    >
      <View style={styles.iconCircle}>
        {getCategoryIcon(expense.category)}
      </View>

      <View style={styles.infoCol}>
        <SproutText style={styles.title} numberOfLines={1}>
          {expense.note || expense.category}
        </SproutText>
        <SproutText style={styles.subtitle} numberOfLines={1}>
          {subText}
        </SproutText>
      </View>

      <View style={styles.amountCol}>
        <SproutText style={styles.amount}>
          {formatCurrency(expense.amount)}
        </SproutText>
        <SproutText style={[styles.foot, { color: footColor }]}>
          {footText}
        </SproutText>
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
    borderBottomColor: '#CBD7CC',
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
    paddingRight: spacing.xs,
  },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#183228',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#6D7C72',
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  amount: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    color: '#183228',
  },
  foot: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    marginTop: 2,
  },
});
