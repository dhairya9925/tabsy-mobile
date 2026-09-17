import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../theme';
import { SproutText } from './SproutText';
import {
  MonthlyLedgerResponse,
  CoordinatorPendingCollection,
  CoordinatorPendingRefund,
} from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import { getMonthName } from '../utils/settlementHelpers';
import {
  ShieldAlert,
  CheckCircle2,
  Building2,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

export interface CoordinatorClearingSectionProps {
  ledger: MonthlyLedgerResponse;
  isCoordinator: boolean;
  onConfirmMemberPayment: (member: CoordinatorPendingCollection) => Promise<void>;
  onDisburseRefund: (member: CoordinatorPendingRefund) => Promise<void>;
  onDisburseLandlordRent: (amount: number) => Promise<void>;
  onLockMonth: () => Promise<void>;
  isLoading?: boolean;
}

export const CoordinatorClearingSection: React.FC<CoordinatorClearingSectionProps> = ({
  ledger,
  isCoordinator,
  onConfirmMemberPayment,
  onDisburseRefund,
  onDisburseLandlordRent,
  onLockMonth,
  isLoading = false,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [showAllRefunds, setShowAllRefunds] = useState(false);

  if (!isCoordinator) {
    return null;
  }

  const { coordinator_summary, summary, settlement_status, month, year } = ledger;
  const isLocked = settlement_status === 'locked';

  const pendingCollections = coordinator_summary?.members_to_collect || [];
  const pendingRefunds = coordinator_summary?.members_to_refund || [];
  const rentAmount = summary.total_rent;

  const rentBill = coordinator_summary?.external_bills_pending?.find(
    (b) => b.category === 'rent' || b.category === 'landlord_rent'
  );
  const isRentDisbursed = rentBill ? rentBill.status === 'cleared' : summary.bill_progress_pct >= 100;

  // Count total pending actions for the badge
  const pendingActionCount =
    pendingCollections.length +
    pendingRefunds.length +
    (isRentDisbursed ? 0 : 1);

  const handleConfirm = async (member: CoordinatorPendingCollection) => {
    setActionInProgress(`confirm-${member.user_id}`);
    try {
      await onConfirmMemberPayment(member);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefund = async (member: CoordinatorPendingRefund) => {
    setActionInProgress(`refund-${member.user_id}`);
    try {
      await onDisburseRefund(member);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRentDisburse = async () => {
    setActionInProgress('rent');
    try {
      await onDisburseLandlordRent(rentAmount);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLockMonthPress = () => {
    const monthName = getMonthName(month);
    Alert.alert(
      'Lock Monthly Ledger?',
      `Are you sure you want to lock ${monthName} ${year}? Any unrefunded overpayments will automatically roll over as credits to next month.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock & Rollover',
          style: 'destructive',
          onPress: async () => {
            setActionInProgress('lock');
            try {
              await onLockMonth();
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, shadows.card]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <ShieldAlert size={18} color={pendingActionCount > 0 ? colors.accent : colors.muted} style={{ marginRight: 8 }} />
          <View>
            <SproutText style={styles.title} weight="800">
              Coordinator Clearing Desk
            </SproutText>
            {collapsed && pendingActionCount > 0 && (
              <SproutText style={styles.pendingCountText} weight="600">
                {pendingActionCount} pending action{pendingActionCount !== 1 ? 's' : ''}
              </SproutText>
            )}
            {!collapsed && (
              <SproutText style={styles.subtitle}>
                Bill payouts, member refunds & period lock
              </SproutText>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {collapsed && pendingActionCount > 0 && (
            <View style={styles.countBadge}>
              <SproutText style={styles.countBadgeText} weight="800">
                {pendingActionCount}
              </SproutText>
            </View>
          )}
          {collapsed ? (
            <ChevronDown size={16} color={colors.muted} />
          ) : (
            <ChevronUp size={16} color={colors.muted} />
          )}
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.content}>
          {/* Section 1: Landlord Rent Disbursal */}
          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Building2 size={15} color={colors.accent} style={{ marginRight: 6 }} />
              <SproutText style={styles.subCardTitle} weight="700">
                Landlord Rent Payout
              </SproutText>
            </View>

            <View style={styles.rentRow}>
              <View>
                <SproutText style={styles.rentAmount} weight="800">
                  {formatCurrencyExact(rentAmount)}
                </SproutText>
                <SproutText style={styles.rentMeta}>
                  Status: {isRentDisbursed ? 'Cleared from Pooled Funds' : 'Pending Payment'}
                </SproutText>
              </View>

              {isRentDisbursed ? (
                <View style={styles.clearedBadge}>
                  <CheckCircle2 size={13} color="#183228" style={{ marginRight: 4 }} />
                  <SproutText style={styles.clearedText} weight="700">
                    Paid
                  </SproutText>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rentActionBtn]}
                  onPress={handleRentDisburse}
                  disabled={actionInProgress === 'rent' || isLocked}
                  activeOpacity={0.8}
                >
                  {actionInProgress === 'rent' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <SproutText style={styles.actionBtnText} weight="700">
                      Mark Rent Paid
                    </SproutText>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Section 2: Pending Roommate Collections */}
          {pendingCollections.length > 0 && (
            <View style={styles.subCard}>
              <SproutText style={styles.subCardTitle} weight="700">
                Awaiting Roommate Collections ({pendingCollections.length})
              </SproutText>
              {(showAllCollections ? pendingCollections : pendingCollections.slice(0, 3)).map((m) => (
                <View key={m.user_id} style={styles.itemRow}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <SproutText style={styles.itemName} weight="600" numberOfLines={1} ellipsizeMode="tail">
                      {m.display_name}
                    </SproutText>
                    <SproutText style={styles.itemSub} numberOfLines={1} ellipsizeMode="tail">
                      Owes {formatCurrencyExact(m.amount)} · {m.status === 'submitted' ? 'Marked "I\'ve paid"' : 'Unpaid'}
                    </SproutText>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.confirmBtn]}
                    onPress={() => handleConfirm(m)}
                    disabled={actionInProgress === `confirm-${m.user_id}` || isLocked}
                    activeOpacity={0.8}
                  >
                    {actionInProgress === `confirm-${m.user_id}` ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <SproutText style={styles.actionBtnText} weight="700">
                        Confirm ₹{Math.round(m.amount)}
                      </SproutText>
                    )}
                  </TouchableOpacity>
                </View>
              ))}

              {pendingCollections.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreRow}
                  onPress={() => setShowAllCollections((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <SproutText style={styles.showMoreText} weight="700">
                    {showAllCollections ? 'Show fewer collections' : `Show all ${pendingCollections.length} collections`}
                  </SproutText>
                  {showAllCollections ? (
                    <ChevronUp size={11} color={colors.accent} style={{ marginLeft: 3 }} />
                  ) : (
                    <ChevronDown size={11} color={colors.accent} style={{ marginLeft: 3 }} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Section 3: Pending Refunds */}
          {pendingRefunds.length > 0 && (
            <View style={styles.subCard}>
              <View style={styles.subCardHeader}>
                <Sparkles size={14} color={colors.accent} style={{ marginRight: 5 }} />
                <SproutText style={styles.subCardTitle} weight="700">
                  Pending Member Reimbursements ({pendingRefunds.length})
                </SproutText>
              </View>
              {(showAllRefunds ? pendingRefunds : pendingRefunds.slice(0, 3)).map((m) => (
                <View key={m.user_id} style={styles.itemRow}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <SproutText style={styles.itemName} weight="600" numberOfLines={1} ellipsizeMode="tail">
                      {m.display_name}
                    </SproutText>
                    <SproutText style={styles.itemSub} numberOfLines={1} ellipsizeMode="tail">
                      Refund remaining: {formatCurrencyExact(m.remaining_refund)}
                    </SproutText>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.refundActionBtn]}
                    onPress={() => handleRefund(m)}
                    disabled={actionInProgress === `refund-${m.user_id}` || isLocked}
                    activeOpacity={0.8}
                  >
                    {actionInProgress === `refund-${m.user_id}` ? (
                      <ActivityIndicator size="small" color="#183228" />
                    ) : (
                      <SproutText style={[styles.actionBtnText, { color: '#183228' }]} weight="700">
                        Disburse Refund
                      </SproutText>
                    )}
                  </TouchableOpacity>
                </View>
              ))}

              {pendingRefunds.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreRow}
                  onPress={() => setShowAllRefunds((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <SproutText style={styles.showMoreText} weight="700">
                    {showAllRefunds ? 'Show fewer refunds' : `Show all ${pendingRefunds.length} refunds`}
                  </SproutText>
                  {showAllRefunds ? (
                    <ChevronUp size={11} color={colors.accent} style={{ marginLeft: 3 }} />
                  ) : (
                    <ChevronDown size={11} color={colors.accent} style={{ marginLeft: 3 }} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Section 4: Lock Month & Rollover */}
          <View style={styles.lockCard}>
            <View style={styles.lockRow}>
              <Lock size={15} color={isLocked ? colors.muted : colors.text} style={{ marginRight: 6 }} />
              <SproutText style={styles.lockTitle} weight="700">
                {isLocked ? 'Month Locked' : 'Close Monthly Cycle'}
              </SproutText>
            </View>
            <SproutText style={styles.lockSubtitle}>
              {isLocked
                ? 'This monthly ledger is locked. Overpayments have been rolled over.'
                : 'Freezes ledger calculations and carries over unrefunded credits to next month.'}
            </SproutText>

            {!isLocked && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.lockBtn]}
                onPress={handleLockMonthPress}
                disabled={actionInProgress === 'lock'}
                activeOpacity={0.8}
              >
                {actionInProgress === 'lock' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SproutText style={[styles.actionBtnText, { color: '#F6F7ED' }]} weight="700">
                    Lock Month & Rollover
                  </SproutText>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 12,
    marginHorizontal: 0,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13.5,
    color: colors.text,
  },
  subtitle: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  pendingCountText: {
    fontSize: 10.5,
    color: colors.accent,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: '#F4DACD',
    borderRadius: radii.full,
    minWidth: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#183228',
  },
  content: {
    marginTop: 6,
  },
  subCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: 8,
    marginBottom: 5,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  subCardTitle: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  rentAmount: {
    fontSize: 14,
    color: colors.text,
  },
  rentMeta: {
    fontSize: 9.5,
    fontFamily: fontFamilies.medium,
    color: colors.muted,
    marginTop: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2.5,
    marginTop: 2,
  },
  itemName: {
    fontSize: 11.5,
    fontFamily: fontFamilies.medium,
    color: colors.text,
  },
  itemSub: {
    fontSize: 9.5,
    fontFamily: fontFamilies.medium,
    color: colors.muted,
  },
  actionBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rentActionBtn: {
    backgroundColor: colors.text,
  },
  confirmBtn: {
    backgroundColor: colors.text,
  },
  refundActionBtn: {
    backgroundColor: colors.sun, // Warm gold button
  },
  lockBtn: {
    backgroundColor: colors.text, // Forest button #183228
    marginTop: 4,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  showMoreText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
  },
  clearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D8E8CB',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radii.full,
  },
  clearedText: {
    fontSize: 9.5,
    fontFamily: fontFamilies.bold,
    color: '#183228',
  },
  lockCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: 8,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 11.5,
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },
  lockSubtitle: {
    fontSize: 9.5,
    fontFamily: fontFamilies.medium,
    color: colors.muted,
    marginTop: 1,
  },
});
