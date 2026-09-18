import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SharedStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  CircleButton,
  ScreenShell,
  Toast,
  MonthSelectorCapsule,
  HeroActionSlipCard,
  MonthlyLedgerTable,
  CoordinatorClearingSection,
  MonthlyHouseholdLedgerSkeleton,
  EmptyState,
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
import { getMonthName } from '../../utils/settlementHelpers';
import { buildFallbackLedger } from '../../utils/monthlyLedgerHelpers';
import { ArrowLeft, Users } from 'lucide-react-native';

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
    setLedger(null);
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setLedger(null);
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Synthesized fallback ledger whenever the backend endpoint is not yet supported or returns 404.
  // This ensures the screen renders the exact same components (HeroActionSlipCard, MonthlyLedgerTable, CoordinatorClearingSection).
  const fallbackLedger = useMemo(() => {
    if (!members || members.length === 0) return null;
    return buildFallbackLedger({
      groupId,
      groupName: groupName || 'Household',
      month,
      year,
      members,
      expenses,
      memberStatuses,
      settlement,
      currentUserId,
    });
  }, [groupId, groupName, month, year, members, expenses, memberStatuses, settlement, currentUserId]);

  const effectiveLedger = ledger || fallbackLedger;

  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isCoordinator =
    currentMember?.role === 'admin' ||
    currentMember?.role === 'coordinator' ||
    effectiveLedger?.members.find((m) => m.user_id === currentUserId)?.role === 'admin';

  // Roommate "I've Paid" action
  const handleRecordMyPayment = async () => {
    if (!effectiveLedger?.my_summary || !currentUserId) return;
    setIsSubmittingPayment(true);
    try {
      if (ledger) {
        await groupsApi.recordMonthlyLedgerContribution(groupId, month, year, {
          from_user_id: currentUserId,
          amount: effectiveLedger.my_summary.amount,
          note: `Self-reported payment for ${getMonthName(month)} ${year}`,
        });
        setSuccessMessage('Payment submitted! Awaiting coordinator confirmation.');
      } else {
        // Fallback flow: mark member completed for this settlement cycle
        let settlementId = settlement?.id;
        if (!settlementId) {
          const created = await groupsApi.createMonthlySettlement(groupId, month, year);
          settlementId = created.id;
          setSettlement(created);
        }
        await groupsApi.markMemberCompleted(groupId, settlementId);
        setSuccessMessage('Your payment/expenses have been recorded for this cycle!');
      }
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
      if (ledger) {
        await groupsApi.recordMonthlyLedgerContribution(groupId, month, year, {
          from_user_id: member.user_id,
          amount: member.amount,
          note: `Confirmed received by coordinator for ${getMonthName(month)} ${year}`,
        });
      } else if (settlement?.id) {
        await groupsApi.markMemberCompleted(groupId, settlement.id);
      }
      setSuccessMessage(`Payment from ${member.display_name} confirmed!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm payment');
    }
  };

  // Coordinator confirms roommate contribution directly from table
  const handleTableConfirmContribution = async (member: MemberLedgerItem) => {
    try {
      if (ledger) {
        await groupsApi.recordMonthlyLedgerContribution(groupId, month, year, {
          from_user_id: member.user_id,
          amount: member.balance,
          note: `Confirmed received by coordinator for ${getMonthName(month)} ${year}`,
        });
      } else if (settlement?.id) {
        await groupsApi.markMemberCompleted(groupId, settlement.id);
      }
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
      if (ledger) {
        await groupsApi.lockMonthlyLedger(groupId, month, year, {
          rollover_unclaimed_refunds: true,
          note: `Cycle closed for ${getMonthName(month)} ${year}`,
        });
      } else {
        await groupsApi.finalizeMonthlySettlement(groupId, month, year);
      }
      setSuccessMessage(`${getMonthName(month)} ${year} has been locked!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to lock month');
    }
  };

  // Member finalization handler
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
          style={{ marginRight: 15 }}
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

      {/* Household Ledger State: Uses the exact same screen components uniformly */}
      {isLoading && !effectiveLedger ? (
        <MonthlyHouseholdLedgerSkeleton />
      ) : effectiveLedger ? (
        <>
          {/* Hero Action Slip Card (with merged progress gauges & tactile actions) */}
          <HeroActionSlipCard
            mySummary={effectiveLedger.my_summary || null}
            monthName={getMonthName(month)}
            year={year}
            onRecordPaymentPress={handleRecordMyPayment}
            isSubmittingPayment={isSubmittingPayment}
            summary={effectiveLedger.summary}
            coordinatorSummary={effectiveLedger.coordinator_summary}
            totalMembers={effectiveLedger.members.length}
            onFinalizePress={handleFinalizeMine}
            isFinalizing={isFinalizing}
            canFinalize={settlement?.status !== 'locked'}
            isFinalized={isCurrentUserCompleted}
          />

          {/* Household Ledger Table (All flatmates breakdown) */}
          <MonthlyLedgerTable
            members={effectiveLedger.members}
            summary={effectiveLedger.summary}
            currentUserId={currentUserId}
            isCoordinator={isCoordinator}
            onConfirmContribution={handleTableConfirmContribution}
            onDisburseRefund={handleTableDisburseRefund}
          />

          {/* Coordinator Clearing Desk (For Admin / Pramukh) */}
          {isCoordinator && (
            <CoordinatorClearingSection
              ledger={effectiveLedger}
              isCoordinator={isCoordinator}
              onConfirmMemberPayment={handleCoordinatorConfirmPayment}
              onDisburseRefund={handleCoordinatorDisburseRefund}
              onDisburseLandlordRent={handleCoordinatorDisburseRent}
              onLockMonth={handleCoordinatorLockMonth}
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={<Users size={32} color={colors.accent} />}
          title="No flatmates found"
          subtitle="Add flatmates to this group to view the monthly household ledger."
        />
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
});
