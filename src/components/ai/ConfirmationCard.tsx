import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../../theme';
import { SproutText } from '../SproutText';
import { AIParseResponse } from '../../api/ai';
import { formatCurrencyExact, toLocalDateString } from '../../utils/formatters';
import {
  Check,
  X,
  Tag,
  Calendar,
  Users,
  User,
  Receipt,
  Pencil,
  ChevronDown,
  Utensils,
  Car,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react-native';

interface ConfirmationCardProps {
  expense: AIParseResponse;
  onConfirm: (expense: AIParseResponse) => void | Promise<void>;
  onCancel: () => void;
  isConfirming?: boolean;
}

const CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'bills', label: 'Bills' },
  { id: 'other', label: 'Other' },
];

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  expense,
  onConfirm,
  onCancel,
  isConfirming = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Editable draft states
  const [draftAmount, setDraftAmount] = useState<string>(
    expense.amount !== undefined ? String(expense.amount) : '0'
  );
  const [draftType, setDraftType] = useState<'personal' | 'group' | 'friend'>(
    expense.expense_type || 'personal'
  );
  const [draftCategory, setDraftCategory] = useState<string>(
    expense.category || 'other'
  );
  const [draftNote, setDraftNote] = useState<string>(expense.note || '');
  const [draftDate, setDraftDate] = useState<string>(
    expense.expense_date || toLocalDateString(new Date())
  );
  const [draftSplitType, setDraftSplitType] = useState<'equal' | 'full' | 'custom'>(
    expense.split_type || 'equal'
  );

  // Synchronize when expense prop changes
  useEffect(() => {
    if (expense.amount !== undefined) setDraftAmount(String(expense.amount));
    if (expense.expense_type) setDraftType(expense.expense_type);
    if (expense.category) setDraftCategory(expense.category);
    if (expense.note) setDraftNote(expense.note);
    if (expense.expense_date) setDraftDate(expense.expense_date);
    if (expense.split_type) setDraftSplitType(expense.split_type);
  }, [expense]);

  const numericAmount = parseFloat(draftAmount) || 0;
  const amountStr = formatCurrencyExact(numericAmount);

  const typeLabel =
    draftType === 'group'
      ? 'Group Expense'
      : draftType === 'friend'
      ? 'Friend 1:1'
      : 'Personal Expense';

  const handleConfirmPress = () => {
    const updatedExpense: AIParseResponse = {
      ...expense,
      amount: numericAmount,
      expense_type: draftType,
      category: draftCategory,
      note: draftNote.trim() || undefined,
      expense_date: draftDate,
      split_type: draftSplitType,
    };
    onConfirm(updatedExpense);
  };

  const getTodayStr = () => toLocalDateString(new Date());
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateString(d);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Top Header Row with Type Badge and Edit Button */}
        <View style={styles.header}>
          <View style={styles.typeBadge}>
            <Receipt size={13} color={colors.accent} />
            <SproutText variant="caption" style={styles.typeBadgeText}>
              {typeLabel.toUpperCase()}
            </SproutText>
          </View>

          <TouchableOpacity
            style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
            onPress={() => setIsEditing(!isEditing)}
            activeOpacity={0.7}
          >
            <Pencil size={13} color={isEditing ? colors.onAccent : colors.accent} />
            <SproutText
              variant="caption"
              style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}
            >
              {isEditing ? 'Done' : 'Edit'}
            </SproutText>
          </TouchableOpacity>
        </View>

        {/* Amount Display or Inline Input */}
        <View style={styles.amountSection}>
          <SproutText variant="eyebrow" style={styles.amountLabel}>
            TOTAL AMOUNT
          </SproutText>

          {isEditing ? (
            <View style={styles.amountInputRow}>
              <SproutText variant="amount" style={styles.currencyPrefix}>
                ₹
              </SproutText>
              <TextInput
                style={styles.amountInput}
                value={draftAmount}
                onChangeText={setDraftAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.line}
                autoFocus
              />
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsEditing(true)}
              style={styles.amountDisplayRow}
            >
              <SproutText variant="hero" style={styles.amountText}>
                {amountStr}
              </SproutText>
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Mode Controls */}
        {isEditing ? (
          <View style={styles.editControls}>
            {/* Expense Type Selector */}
            <View style={styles.editRow}>
              <SproutText variant="caption" style={styles.editLabel}>
                Type:
              </SproutText>
              <View style={styles.pillGroup}>
                {(['personal', 'group', 'friend'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pill, draftType === t && styles.pillActive]}
                    onPress={() => setDraftType(t)}
                  >
                    <SproutText
                      variant="caption"
                      style={[styles.pillText, draftType === t && styles.pillTextActive]}
                    >
                      {t === 'personal' ? 'Personal' : t === 'group' ? 'Group' : 'Friend'}
                    </SproutText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.editRow}>
              <SproutText variant="caption" style={styles.editLabel}>
                Category:
              </SproutText>
              <View style={styles.pillGroup}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.pill,
                      draftCategory.toLowerCase().includes(cat.id) && styles.pillActive,
                    ]}
                    onPress={() => setDraftCategory(cat.id)}
                  >
                    <SproutText
                      variant="caption"
                      style={[
                        styles.pillText,
                        draftCategory.toLowerCase().includes(cat.id) && styles.pillTextActive,
                      ]}
                    >
                      {cat.label}
                    </SproutText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Selector */}
            <View style={styles.editRow}>
              <SproutText variant="caption" style={styles.editLabel}>
                Date:
              </SproutText>
              <View style={styles.pillGroup}>
                <TouchableOpacity
                  style={[styles.pill, draftDate === getTodayStr() && styles.pillActive]}
                  onPress={() => setDraftDate(getTodayStr())}
                >
                  <SproutText
                    variant="caption"
                    style={[
                      styles.pillText,
                      draftDate === getTodayStr() && styles.pillTextActive,
                    ]}
                  >
                    Today
                  </SproutText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pill, draftDate === getYesterdayStr() && styles.pillActive]}
                  onPress={() => setDraftDate(getYesterdayStr())}
                >
                  <SproutText
                    variant="caption"
                    style={[
                      styles.pillText,
                      draftDate === getYesterdayStr() && styles.pillTextActive,
                    ]}
                  >
                    Yesterday
                  </SproutText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Note / Description Input */}
            <View style={styles.editRow}>
              <SproutText variant="caption" style={styles.editLabel}>
                Note:
              </SproutText>
              <TextInput
                style={styles.noteInput}
                value={draftNote}
                onChangeText={setDraftNote}
                placeholder="Optional note / description..."
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Split Type (for group or friend) */}
            {(draftType === 'group' || draftType === 'friend') && (
              <View style={styles.editRow}>
                <SproutText variant="caption" style={styles.editLabel}>
                  Split:
                </SproutText>
                <View style={styles.pillGroup}>
                  <TouchableOpacity
                    style={[styles.pill, draftSplitType === 'equal' && styles.pillActive]}
                    onPress={() => setDraftSplitType('equal')}
                  >
                    <SproutText
                      variant="caption"
                      style={[
                        styles.pillText,
                        draftSplitType === 'equal' && styles.pillTextActive,
                      ]}
                    >
                      Equal
                    </SproutText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, draftSplitType === 'full' && styles.pillActive]}
                    onPress={() => setDraftSplitType('full')}
                  >
                    <SproutText
                      variant="caption"
                      style={[
                        styles.pillText,
                        draftSplitType === 'full' && styles.pillTextActive,
                      ]}
                    >
                      Full Share
                    </SproutText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* View Mode Details Grid */
          <View style={styles.detailsList}>
            {/* Category */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
            >
              <View style={styles.detailIcon}>
                <Tag size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Category:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue}>
                {draftCategory || 'General'}
              </SproutText>
            </TouchableOpacity>

            {/* Group Target */}
            {draftType === 'group' && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Users size={14} color={colors.muted} />
                </View>
                <SproutText variant="caption" style={styles.detailLabel}>
                  Group:
                </SproutText>
                <SproutText variant="body" style={styles.detailValue}>
                  {expense.group_name || 'Assigned Group'}
                </SproutText>
              </View>
            )}

            {/* Friend Target */}
            {draftType === 'friend' && (
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
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
            >
              <View style={styles.detailIcon}>
                <Receipt size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Note:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue} numberOfLines={2}>
                {draftNote || 'None (tap to add)'}
              </SproutText>
            </TouchableOpacity>

            {/* Split Type */}
            {(draftType === 'group' || draftType === 'friend') && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Users size={14} color={colors.muted} />
                </View>
                <SproutText variant="caption" style={styles.detailLabel}>
                  Split:
                </SproutText>
                <SproutText variant="body" style={styles.detailValue}>
                  {draftSplitType === 'full' ? 'Full Share' : 'Split Equally'}
                </SproutText>
              </View>
            )}

            {/* Date */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
            >
              <View style={styles.detailIcon}>
                <Calendar size={14} color={colors.muted} />
              </View>
              <SproutText variant="caption" style={styles.detailLabel}>
                Date:
              </SproutText>
              <SproutText variant="body" style={styles.detailValue}>
                {draftDate === getTodayStr()
                  ? 'Today'
                  : draftDate === getYesterdayStr()
                  ? 'Yesterday'
                  : draftDate}
              </SproutText>
            </TouchableOpacity>
          </View>
        )}

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
            onPress={handleConfirmPress}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    gap: 4,
  },
  editToggleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editToggleText: {
    color: colors.accent,
    fontFamily: fontFamilies.bold,
    fontSize: 11,
  },
  editToggleTextActive: {
    color: colors.onAccent,
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
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    fontFamily: fontFamilies.mono,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 26,
    color: colors.text,
    fontFamily: fontFamilies.mono,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 26,
    fontFamily: fontFamilies.mono,
    color: colors.text,
    minWidth: 120,
    paddingVertical: 2,
  },
  editControls: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  editRow: {
    flexDirection: 'column',
    gap: 4,
  },
  editLabel: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fontFamilies.bold,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fontFamilies.medium,
  },
  pillTextActive: {
    color: colors.accent,
    fontFamily: fontFamilies.bold,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.text,
    fontFamily: fontFamilies.regular,
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
