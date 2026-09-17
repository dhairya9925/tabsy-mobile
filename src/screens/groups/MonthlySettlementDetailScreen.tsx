import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SharedStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  ScreenShell,
  AvatarCircle,
  Toast,
  MonthSelectorCapsule,
  HeroActionSlipCard,
  MonthlyLedgerTable,
  CoordinatorClearingSection,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { useAuthStore } from '../../store/useAuthStore';
import {
  MonthlySettlement,
  MemberMonthlyStatus,
  SettlementExpense,
  GroupMember,
  MonthlyLedgerResponse,
  MemberLedgerItem,
  CoordinatorPendingCollection,
  CoordinatorPendingRefund,
} from '../../types';
import {
  calculateSettlementProgress,
  getSettlementStatusMeta,
  getMonthName,
} from '../../utils/settlementHelpers';
import { formatCurrencyExact, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Receipt,
  Users,
} from 'lucide-react-native';

type Props = NativeStackScreenProps<SharedStackParamList, 'MonthlySettlementDetail'>;

export const MonthlySettlementDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, groupName } = route.params;
  const currentUser = useAuthStore((s) => s.user);

  const now = new Date();
  const [month, setMonth] = useState(route.params.month || now.getMonth() + 1);
  const [year, setYear] = useState(route.params.year || now.getFullYear());

  const [settlement, setSettlement] = useState<MonthlySettlement | null>(null);
  const [memberStatuses, setMemberStatuses] = useState<MemberMonthlyStatus[]>([]);
  const [expenses, setExpenses] = useState<SettlementExpense[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [ledger, setLedger] = useState<MonthlyLedgerResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentUserId = currentUser?.user_id || currentUser?.id;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [mList, sData, expList, ledgerData] = await Promise.all([
        groupsApi.getGroupMembers(groupId).catch(() => []),
        groupsApi.getMonthlySettlement(groupId, month, year).catch(() => null),
        groupsApi.getMonthlySettlementExpenses(groupId, month, year).catch(() => []),
        groupsApi.getMonthlyLedger(groupId, month, year).catch(() => null),
      ]);

      setMembers(mList);
      setSettlement(sData);
      setExpenses(expList);
      setLedger(ledgerData);

      if (sData?.id) {
        const statuses = await groupsApi.getMemberMonthlyStatus(groupId, sData.id).catch(() => []);
        setMemberStatuses(statuses);
      } else {
        setMemberStatuses([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load settlement details');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isCoordinator =
    currentMember?.role === 'admin' ||
    currentMember?.role === 'coordinator' ||
    (ledger?.members.find((m) => m.user_id === currentUserId)?.role === 'admin');

  // Roommate "I've Paid" action
  const handleRecordMyPayment = async () => {
    if (!ledger?.my_summary || !currentUserId) return;
    setIsSubmittingPayment(true);
    try {
      await groupsApi.recordMonthlyLedgerContribution(groupId, month, year, {
        from_user_id: currentUserId,
        amount: ledger.my_summary.amount,
        note: `Self-reported payment for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage('Payment submitted! Awaiting coordinator confirmation.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Coordinator confirms roommate collection
  const handleCoordinatorConfirmPayment = async (member: CoordinatorPendingCollection) => {
    try {
      await groupsApi.recordMonthlyLedgerContribution(groupId, month, year, {
        from_user_id: member.user_id,
        amount: member.amount,
        note: `Confirmed received by coordinator for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage(`Payment from ${member.display_name} confirmed!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm payment');
    }
  };

  // Coordinator confirms roommate contribution directly from table
  const handleTableConfirmContribution = async (member: MemberLedgerItem) => {
    try {
      await groupsApi.recordMonthlyLedgerContribution(groupId, month, year, {
        from_user_id: member.user_id,
        amount: member.balance,
        note: `Confirmed received by coordinator for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage(`Payment from ${member.display_name} confirmed!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm payment');
    }
  };

  // Coordinator disburses member refund
  const handleCoordinatorDisburseRefund = async (member: CoordinatorPendingRefund) => {
    try {
      await groupsApi.recordMonthlyLedgerDisbursement(groupId, month, year, {
        disbursement_type: 'member_refund',
        amount: member.remaining_refund,
        recipient_user_id: member.user_id,
        category: 'refund',
        reference_note: `Refund fronted costs for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage(`Refund of ₹${Math.round(member.remaining_refund)} disbursed to ${member.display_name}!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disburse refund');
    }
  };

  // Coordinator disburses member refund directly from table
  const handleTableDisburseRefund = async (member: MemberLedgerItem) => {
    try {
      await groupsApi.recordMonthlyLedgerDisbursement(groupId, month, year, {
        disbursement_type: 'member_refund',
        amount: Math.abs(member.balance),
        recipient_user_id: member.user_id,
        category: 'refund',
        reference_note: `Refund fronted costs for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage(`Refund disbursed to ${member.display_name}!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disburse refund');
    }
  };

  // Coordinator marks landlord rent paid
  const handleCoordinatorDisburseRent = async (amount: number) => {
    try {
      await groupsApi.recordMonthlyLedgerDisbursement(groupId, month, year, {
        disbursement_type: 'vendor_bill',
        amount,
        recipient_name: 'Landlord',
        category: 'landlord_rent',
        reference_note: `House rent payment for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage(`Landlord rent of ₹${Math.round(amount)} marked as paid from pooled funds!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record rent payout');
    }
  };

  // Coordinator locks monthly ledger
  const handleCoordinatorLockMonth = async () => {
    try {
      await groupsApi.lockMonthlyLedger(groupId, month, year, {
        rollover_unclaimed_refunds: true,
        note: `Cycle closed for ${getMonthName(month)} ${year}`,
      });
      setSuccessMessage(`${getMonthName(month)} ${year} has been locked and overpayments rolled over!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to lock month');
    }
  };

  // Legacy finalize handler
  const handleFinalizeMine = async () => {
    setIsFinalizing(true);
    try {
      let settlementId = settlement?.id;
      if (!settlementId) {
        const created = await groupsApi.createMonthlySettlement(groupId, month, year);
        settlementId = created.id;
        setSettlement(created);
      }

      await groupsApi.markMemberCompleted(groupId, settlementId);
      setSuccessMessage('Your expenses for this month have been finalized!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to finalize expenses');
    } finally {
      setIsFinalizing(false);
    }
  };

  const isCurrentUserCompleted = memberStatuses.some((s) => s.user_id === currentUserId && s.is_completed);
  const progress = useMemo(() => {
    const completedCount = memberStatuses.filter((s) => s.is_completed).length;
    return calculateSettlementProgress(members.length, completedCount);
  }, [members.length, memberStatuses]);
  const statusMeta = getSettlementStatusMeta(settlement?.status);
  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <ScreenShell
      contentContainerStyle={styles.container}
      onRefresh={loadData}
      isRefreshing={isLoading}
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

      {/* Top Header */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.topBarCenter}>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.topBarEyebrow}>
            {groupName ? `${groupName.toUpperCase()} · SETTLEMENT` : 'HOUSEHOLD · SETTLEMENT'}
          </SproutText>
          <SproutText variant="title" color={colors.text} weight="700" style={styles.topBarTitle}>
            Monthly Household Ledger
          </SproutText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Month Navigator Strip */}
      <MonthSelectorCapsule
        month={month}
        year={year}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />

      {/* ========================================================================= */}
      {/* 1. SHARED LIVING EXPERIENCE (When Monthly Ledger Data is Available)       */}
      {/* ========================================================================= */}
      {ledger ? (
        <>
          {/* Hero Action Slip Card (with merged progress gauges) */}
          <HeroActionSlipCard
            mySummary={ledger.my_summary || null}
            monthName={getMonthName(month)}
            year={year}
            onRecordPaymentPress={handleRecordMyPayment}
            isSubmittingPayment={isSubmittingPayment}
            summary={ledger.summary}
            coordinatorSummary={ledger.coordinator_summary}
            totalMembers={ledger.members.length}
          />

          {/* Household Ledger Table (All flatmates breakdown) */}
          <MonthlyLedgerTable
            members={ledger.members}
            summary={ledger.summary}
            currentUserId={currentUserId}
            isCoordinator={isCoordinator}
            onConfirmContribution={handleTableConfirmContribution}
            onDisburseRefund={handleTableDisburseRefund}
          />

          {/* Coordinator Clearing Desk (For Admin / Pramukh) */}
          {isCoordinator && (
            <CoordinatorClearingSection
              ledger={ledger}
              isCoordinator={isCoordinator}
              onConfirmMemberPayment={handleCoordinatorConfirmPayment}
              onDisburseRefund={handleCoordinatorDisburseRefund}
              onDisburseLandlordRent={handleCoordinatorDisburseRent}
              onLockMonth={handleCoordinatorLockMonth}
            />
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* 2. LEGACY FALLBACK (For non-shared living groups or uninitialized ledger)   */
        /* ========================================================================= */
        <>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View>
                <SproutText variant="eyebrow" color={colors.muted}>
                  SETTLEMENT STATUS
                </SproutText>
                <SproutText variant="title" color={colors.text} style={styles.statusTitle}>
                  {statusMeta.label}
                </SproutText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.bgColor }]}>
                {settlement?.status === 'locked' ? (
                  <Lock size={13} color={statusMeta.textColor} />
                ) : (
                  <CheckCircle2 size={13} color={statusMeta.textColor} />
                )}
                <SproutText variant="caption" color={statusMeta.textColor} style={styles.badgeText}>
                  {statusMeta.label}
                </SproutText>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <SproutText variant="caption" color={colors.muted}>
                  Member Finalization
                </SproutText>
                <SproutText variant="monoSm" color={colors.text}>
                  {progress.completedCount} / {progress.totalMembers} ({progress.percentage}%)
                </SproutText>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress.percentage}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
            </View>

            {/* Action Button */}
            {settlement?.status !== 'locked' && (
              <View style={styles.actionContainer}>
                {isCurrentUserCompleted ? (
                  <View style={styles.completedBadge}>
                    <CheckCircle2 size={16} color={colors.accent} />
                    <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
                      You have finalized your expenses
                    </SproutText>
                  </View>
                ) : (
                  <SproutButton
                    label="Finalize My Expenses"
                    onPress={handleFinalizeMine}
                    isLoading={isFinalizing}
                  />
                )}
              </View>
            )}
          </View>

          {/* Member Status List */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Users size={18} color={colors.accent} />
              <SproutText variant="subtitle" color={colors.text} weight="700">
                Member Statuses
              </SproutText>
            </View>

            {members.map((member) => {
              const isDone = memberStatuses.some((s) => s.user_id === member.user_id && s.is_completed);
              const name = member.profile?.display_name || member.profile?.email || 'Member';

              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberLeft}>
                    <AvatarCircle name={name} size={36} />
                    <View>
                      <SproutText variant="body" color={colors.text} weight="600">
                        {name}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted}>
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </SproutText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.memberStatusPill,
                      { backgroundColor: isDone ? colors.soft : colors.background },
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={12} color={colors.accent} />
                    ) : null}
                    <SproutText
                      variant="caption"
                      color={isDone ? colors.accent : colors.muted}
                      style={isDone ? { fontWeight: '700' } : undefined}
                    >
                      {isDone ? 'Finalized' : 'Pending'}
                    </SproutText>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Period Expenses Breakdown */}
          <View style={styles.card}>
            <View style={styles.cardHeaderWithAmount}>
              <View style={styles.cardHeaderLeft}>
                <Receipt size={18} color={colors.accent} />
                <SproutText variant="subtitle" color={colors.text} weight="700">
                  Period Expenses
                </SproutText>
              </View>
              <SproutText variant="monoSm" color={colors.accent}>
                {formatCurrencyExact(monthTotal)}
              </SproutText>
            </View>

            {expenses.length > 0 ? (
              expenses.map((exp) => (
                <View key={exp.id} style={styles.expenseRow}>
                  <View style={styles.expenseLeft}>
                    <SproutText variant="body" color={colors.text} weight="600">
                      {exp.note || exp.category}
                    </SproutText>
                    <SproutText variant="caption" color={colors.muted}>
                      {formatDate(exp.expense_date)} · Paid by {exp.payer_name || 'Member'}
                    </SproutText>
                  </View>
                  <SproutText variant="monoSm" color={colors.text}>
                    {formatCurrencyExact(exp.amount)}
                  </SproutText>
                </View>
              ))
            ) : (
              <View style={styles.emptyExpenses}>
                <SproutText variant="caption" color={colors.muted}>
                  No expenses recorded for this settlement period
                </SproutText>
              </View>
            )}
          </View>
        </>
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarEyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.muted,
    marginBottom: 2,
  },
  topBarTitle: {
    fontSize: 16,
    letterSpacing: -0.4,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginHorizontal: 0,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusTitle: {
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  badgeText: {
    fontWeight: '700',
  },
  progressSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  actionContainer: {
    marginTop: spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.soft,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  cardHeaderWithAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  expenseLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
