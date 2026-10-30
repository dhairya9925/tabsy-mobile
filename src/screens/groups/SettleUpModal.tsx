import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, useTheme, radii, spacing, fontFamilies } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  AvatarCircle,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { GroupExpense, GroupSettlementRecord } from '../../types';
import { formatCurrencyExact, formatDate, formatDateTime } from '../../utils/formatters';
import {
  X,
  Handshake,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Sparkles,
} from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'SettleUpModal'>;

export const SettleUpModal: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, balance } = route.params;
  const { colors, isDark } = useTheme();

  // Form & Execution state
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Expenses & Breakdown state
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // Post-settlement receipt state
  const [settlementReceipt, setSettlementReceipt] = useState<GroupSettlementRecord | null>(null);
  const [settledCount, setSettledCount] = useState<number>(0);

  // Fetch group expenses to show splits breakdown
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await groupsApi.getGroupExpenses(groupId);
        if (isMounted) {
          setExpenses(data || []);
        }
      } catch (err) {
        console.warn('[SettleUpModal] Failed to load group expenses:', err);
      } finally {
        if (isMounted) setLoadingExpenses(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // Compute splits between from_user and to_user
  const directSplits = useMemo(() => {
    const items: Array<{
      expenseId: string;
      title: string;
      category: string;
      date: string;
      amount: number;
      isDebt: boolean; // true = from_user owes to_user; false = counter credit
    }> = [];

    expenses.forEach((exp) => {
      const payerId = exp.paid_by || exp.user_id;
      const title = exp.note?.trim() || exp.category || 'Expense';
      const date = formatDate(exp.expense_date);

      (exp.splits || []).forEach((split) => {
        if (split.is_settled) return;

        // Case 1: to_user paid, from_user has an unsettled split (from_user owes to_user)
        if (payerId === balance.to_user_id && split.user_id === balance.from_user_id) {
          items.push({
            expenseId: exp.id,
            title,
            category: exp.category,
            date,
            amount: split.amount,
            isDebt: true,
          });
        }

        // Case 2: from_user paid, to_user has an unsettled split (counter offset / credit)
        if (payerId === balance.from_user_id && split.user_id === balance.to_user_id) {
          items.push({
            expenseId: exp.id,
            title,
            category: exp.category,
            date,
            amount: split.amount,
            isDebt: false,
          });
        }
      });
    });

    return items;
  }, [expenses, balance.from_user_id, balance.to_user_id]);

  const handleConfirm = async () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const record = await groupsApi.settleUp(groupId, {
        from_user_id: balance.from_user_id,
        to_user_id: balance.to_user_id,
        amount: balance.amount,
        note: note.trim() || undefined,
      });

      const count = record?.settled_split_ids?.length ?? directSplits.length;
      setSettledCount(count);
      setSettlementReceipt(record);

      setSuccessMessage('Settlement recorded successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record settlement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  // ============================================================================
  // VIEW: Confirmation Receipt (After Successful Settlement)
  // ============================================================================
  if (settlementReceipt) {
    const shortRefId = settlementReceipt.id.startsWith('sr-')
      ? settlementReceipt.id.toUpperCase()
      : `#SR-${settlementReceipt.id.slice(0, 8).toUpperCase()}`;

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={handleDismiss}
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Settlement Receipt
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.receiptScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Hero Badge */}
          <View style={styles.receiptSuccessHeader}>
            <View style={[styles.receiptSuccessBadge, { backgroundColor: colors.accentSoft }]}>
              <CheckCircle2 size={44} color={colors.accent} strokeWidth={2.5} />
            </View>
            <SproutText variant="title" color={colors.text} weight="800" style={styles.receiptSuccessTitle}>
              Settlement Confirmed
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={{ textAlign: 'center', marginTop: 2 }}>
              Recorded in group ledger and shared with all members.
            </SproutText>
          </View>

          {/* Receipt Card */}
          <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <SproutText variant="eyebrow" color={colors.muted} style={{ letterSpacing: 1.2 }}>
              AMOUNT SETTLED
            </SproutText>
            <SproutText variant="amount" color={colors.accent} style={styles.receiptAmountText}>
              {formatCurrencyExact(settlementReceipt.amount)}
            </SproutText>

            {/* Direction flow */}
            <View style={[styles.directionBox, { borderTopColor: colors.line }]}>
              <View style={styles.memberBox}>
                <AvatarCircle name={settlementReceipt.from_name || balance.from_name} size={42} />
                <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1} style={{ marginTop: 6 }}>
                  {settlementReceipt.from_name || balance.from_name}
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Payer
                </SproutText>
              </View>

              <View style={styles.arrowWrapper}>
                <ArrowRight size={22} color={colors.accent} strokeWidth={2.5} />
              </View>

              <View style={styles.memberBox}>
                <AvatarCircle name={settlementReceipt.to_name || balance.to_name} size={42} />
                <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1} style={{ marginTop: 6 }}>
                  {settlementReceipt.to_name || balance.to_name}
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Recipient
                </SproutText>
              </View>
            </View>

            {/* Key-Value Details */}
            <View style={[styles.receiptDetailsTable, { borderTopColor: colors.line }]}>
              <View style={[styles.receiptDetailRow, { borderBottomColor: colors.line }]}>
                <SproutText variant="caption" color={colors.muted}>
                  Reference
                </SproutText>
                <SproutText variant="caption" color={colors.text} weight="700">
                  {shortRefId}
                </SproutText>
              </View>

              <View style={[styles.receiptDetailRow, { borderBottomColor: colors.line }]}>
                <SproutText variant="caption" color={colors.muted}>
                  Settled At
                </SproutText>
                <SproutText variant="caption" color={colors.text} weight="700">
                  {formatDateTime(settlementReceipt.created_at)}
                </SproutText>
              </View>

              <View style={[styles.receiptDetailRow, { borderBottomColor: colors.line }]}>
                <SproutText variant="caption" color={colors.muted}>
                  Recorded By
                </SproutText>
                <SproutText variant="caption" color={colors.text} weight="700">
                  {settlementReceipt.settled_by_name || 'You'}
                </SproutText>
              </View>

              {settledCount > 0 && (
                <View style={[styles.receiptDetailRow, { borderBottomColor: colors.line }]}>
                  <SproutText variant="caption" color={colors.muted}>
                    Splits Cleared
                  </SproutText>
                  <SproutText variant="caption" color={colors.accent} weight="700">
                    {settledCount} split{settledCount > 1 ? 's' : ''} settled
                  </SproutText>
                </View>
              )}

              {settlementReceipt.note ? (
                <View style={[styles.receiptDetailRow, { borderBottomWidth: 0, paddingBottom: 0, borderBottomColor: colors.line }]}>
                  <SproutText variant="caption" color={colors.muted}>
                    Note
                  </SproutText>
                  <SproutText
                    variant="caption"
                    color={colors.text}
                    weight="600"
                    style={{ flex: 1, textAlign: 'right', marginLeft: spacing.md }}
                  >
                    "{settlementReceipt.note}"
                  </SproutText>
                </View>
              ) : null}
            </View>
          </View>

          {/* 3-Day Protection Notice Banner */}
          <View style={[styles.protectionBanner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Clock size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <SproutText variant="body" color={colors.text} weight="700">
                3-Day Modification Window
              </SproutText>
              <SproutText variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
                Visible to everyone. Any member can add notes or reverse this record until{' '}
                {formatDateTime(settlementReceipt.editable_until)}.
              </SproutText>
            </View>
          </View>
        </ScrollView>

        {/* Done Button */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
          <SproutButton
            label="Done"
            onPress={handleDismiss}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // VIEW: Pre-Settlement Form & Split Breakdown
  // ============================================================================
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Toast
          visible={!!errorMessage}
          message={errorMessage}
          type="error"
          onDismiss={() => setErrorMessage('')}
        />
        <Toast
          visible={!!successMessage}
          message={successMessage}
          type="success"
          onDismiss={() => setSuccessMessage('')}
        />

        {/* Header */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={handleDismiss}
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Settle Up
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Settlement Hero Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
              <Handshake size={32} color={colors.accent} strokeWidth={2} />
            </View>

            <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
              SETTLEMENT AMOUNT
            </SproutText>

            <SproutText variant="amount" color={colors.accent} style={styles.amount}>
              {formatCurrencyExact(balance.amount)}
            </SproutText>

            {/* Direction Row */}
            <View style={[styles.directionBox, { borderTopColor: colors.line }]}>
              <View style={styles.memberBox}>
                <AvatarCircle name={balance.from_name} size={44} />
                <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1} style={{ marginTop: 6 }}>
                  {balance.from_name}
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Payer
                </SproutText>
              </View>

              <View style={styles.arrowWrapper}>
                <ArrowRight size={22} color={colors.accent} strokeWidth={2.5} />
              </View>

              <View style={styles.memberBox}>
                <AvatarCircle name={balance.to_name} size={44} />
                <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1} style={{ marginTop: 6 }}>
                  {balance.to_name}
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Recipient
                </SproutText>
              </View>
            </View>
          </View>

          {/* Breakdown Section: Individual Splits & Expenses Covered */}
          <View style={styles.breakdownSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <Layers size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <SproutText variant="eyebrow" color={colors.muted} style={{ letterSpacing: 1.2 }}>
                  SPLITS BEING SETTLED
                </SproutText>
              </View>
              {loadingExpenses ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : directSplits.length > 0 ? (
                <View style={[styles.splitCountBadge, { backgroundColor: colors.accentSoft }]}>
                  <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                    {directSplits.length} split{directSplits.length > 1 ? 's' : ''}
                  </SproutText>
                </View>
              ) : null}
            </View>

            {loadingExpenses ? (
              <View style={[styles.loadingBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <ActivityIndicator size="small" color={colors.accent} />
                <SproutText variant="caption" color={colors.muted} style={{ marginTop: 6 }}>
                  Calculating splits...
                </SproutText>
              </View>
            ) : directSplits.length > 0 ? (
              <View style={[styles.splitsContainer, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {directSplits.map((item, idx) => (
                  <View
                    key={`split-${item.expenseId}-${idx}`}
                    style={[
                      styles.splitItemRow,
                      idx > 0 && [styles.splitItemBorder, { borderTopColor: colors.line }],
                    ]}
                  >
                    <View style={styles.splitItemLeft}>
                      <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1}>
                        {item.title}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
                        {item.date} • {item.isDebt ? `${balance.from_name}'s share` : `${balance.to_name}'s share offset`}
                      </SproutText>
                    </View>
                    <View style={styles.splitItemRight}>
                      <SproutText
                        variant="body"
                        color={item.isDebt ? colors.negative : colors.accent}
                        weight="700"
                      >
                        {item.isDebt ? '+' : '–'}{formatCurrencyExact(item.amount)}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted} style={{ fontSize: 10, textAlign: 'right' }}>
                        {item.isDebt ? 'owed' : 'credit offset'}
                      </SproutText>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.simplifiedNoteCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Sparkles size={18} color={colors.accent} style={{ marginRight: spacing.sm, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <SproutText variant="caption" color={colors.text} weight="700">
                    Multi-Party Debt Simplification
                  </SproutText>
                  <SproutText variant="caption" color={colors.muted} style={{ marginTop: 2, lineHeight: 16 }}>
                    This payment resolves {balance.from_name}'s net group balance with {balance.to_name}, simplified across group expenses paid by different members.
                  </SproutText>
                </View>
              </View>
            )}
          </View>

          {/* Payment Note Input */}
          <View style={styles.noteSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <FileText size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <SproutText variant="eyebrow" color={colors.muted} style={{ letterSpacing: 1.2 }}>
                  NOTE (OPTIONAL)
                </SproutText>
              </View>
              <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
                {note.length}/255
              </SproutText>
            </View>

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. Paid via UPI / GPay, Cash in person..."
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
              maxLength={255}
              returnKeyType="done"
            />
          </View>

          {/* 3-Day Protection Notice */}
          <View style={[styles.noticeBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <ShieldCheck size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <SproutText variant="caption" color={colors.text} weight="700">
                3-Day Protection Window
              </SproutText>
              <SproutText variant="caption" color={colors.muted} style={styles.noticeText}>
                Recorded to group ledger and visible to all members. Any member can add notes or reverse this settlement within 3 days.
              </SproutText>
            </View>
          </View>
        </ScrollView>

        {/* Action CTA */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
          <SproutButton
            label="Confirm Settlement"
            isLoading={isLoading}
            onPress={handleConfirm}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 24,
  },
  receiptScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 24,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  amount: {
    marginVertical: 4,
  },
  directionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  memberBox: {
    flex: 1,
    alignItems: 'center',
  },
  arrowWrapper: {
    paddingHorizontal: spacing.sm,
  },
  breakdownSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitCountBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  splitsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  splitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  splitItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  splitItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  splitItemRight: {
    alignItems: 'flex-end',
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simplifiedNoteCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteSection: {
    marginBottom: spacing.lg,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamilies.medium,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  noticeText: {
    marginTop: 2,
    lineHeight: 17,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  // Receipt Styles
  receiptSuccessHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  receiptSuccessBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  receiptSuccessTitle: {
    fontSize: 22,
    textAlign: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  receiptAmountText: {
    marginVertical: 4,
    textAlign: 'center',
  },
  receiptDetailsTable: {
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
  },
  protectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    width: '100%',
  },
});
