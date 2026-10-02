import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../../theme';
import { SproutText } from '../SproutText';
import { AIParseResponse } from '../../api/ai';
import { formatCurrencyExact } from '../../utils/formatters';
import { Check, X, Tag, Calendar, Users, User, Receipt } from 'lucide-react-native';

interface ConfirmationCardProps {
  expense: AIParseResponse;
  onConfirm: (expense: AIParseResponse) => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  expense,
  onConfirm,
  onCancel,
  isConfirming = false,
}) => {
  const expenseType = expense.expense_type || 'personal';
  const typeLabel =
    expenseType === 'group'
      ? 'Group Expense'
      : expenseType === 'friend'
      ? 'Friend 1:1'
      : 'Personal Expense';

  const amountStr = expense.amount !== undefined ? formatCurrencyExact(expense.amount) : '₹0.00';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.typeBadge}>
              <Receipt size={13} color={colors.accent} />
              <SproutText variant="caption" style={styles.typeBadgeText}>
                {typeLabel.toUpperCase()}
              </SproutText>
            </View>
          </View>
        </View>

        {/* Amount Display */}
        <View style={styles.amountSection}>
          <SproutText variant="eyebrow" style={styles.amountLabel}>
            TOTAL AMOUNT
          </SproutText>
          <SproutText variant="hero" style={styles.amountText}>
            {amountStr}
          </SproutText>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsList}>
          {/* Category */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Tag size={14} color={colors.muted} />
            </View>
            <SproutText variant="caption" style={styles.detailLabel}>
              Category:
            </SproutText>
            <SproutText variant="body" style={styles.detailValue}>
              {expense.category || 'General'}
            </SproutText>
          </View>

          {/* Group / Friend Target */}
          {expenseType === 'group' && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Users size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Group:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue}>
                {expense.group_name || 'Selected Group'}
              </SproutText>
            </View>
          )}

          {expenseType === 'friend' && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <User size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Friend:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue}>
                {expense.friend_name || 'Selected Friend'}
              </SproutText>
            </View>
          )}

          {/* Note / Description */}
          {expense.note ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Receipt size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Note:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue} numberOfLines={2}>
                {expense.note}
              </SproutText>
            </View>
          ) : null}

          {/* Split Type */}
          {(expenseType === 'group' || expenseType === 'friend') && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Users size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Split:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue}>
                {expense.split_type === 'full' ? 'Full Share' : 'Split Equally'}
              </SproutText>
            </View>
          )}

          {/* Date */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={14} color={colors.muted} />
            </View>
            <SproutText variant="caption" style={styles.detailLabel}>
              Date:
            </SproutText>
            <SproutText variant="body" style={styles.detailValue}>
              {expense.expense_date || 'Today'}
            </SproutText>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isConfirming}
            activeOpacity={0.7}
          >
            <X size={16} color={colors.muted} />
            <SproutText variant="body" style={styles.cancelText}>
              Cancel
            </SproutText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, isConfirming && styles.buttonDisabled]}
            onPress={() => onConfirm(expense)}
            disabled={isConfirming}
            activeOpacity={0.8}
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <>
                <Check size={16} color={colors.onAccent} strokeWidth={2.4} />
                <SproutText variant="body" style={styles.confirmText}>
                  Confirm & Save
                </SproutText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  header: {
    marginBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    gap: 4,
  },
  typeBadgeText: {
    color: colors.accent,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  amountSection: {
    marginVertical: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  amountLabel: {
    color: colors.muted,
    marginBottom: 2,
    fontSize: 10,
  },
  amountText: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    fontFamily: fontFamilies.mono,
  },
  detailsList: {
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 20,
    alignItems: 'center',
    marginRight: 6,
  },
  detailLabel: {
    width: 70,
    color: colors.muted,
    fontSize: 12,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fontFamilies.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    gap: 6,
  },
  cancelText: {
    color: colors.muted,
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    gap: 6,
    ...shadows.card,
  },
  confirmText: {
    color: colors.onAccent,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
