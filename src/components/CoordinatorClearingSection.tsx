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
import { useThemeStore } from '../store/useThemeStore';

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
  const isDark = useThemeStore((s) => s.isDark);
  const [collapsed, setCollapsed] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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
    <View style={[styles.container, isDark && styles.containerDark, shadows.card]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <ShieldAlert size={18} color={colors.clay} style={{ marginRight: 6 }} />
          <View>
            <SproutText style={styles.title} weight="700">
              Coordinator Clearing Desk
            </SproutText>
            <SproutText style={styles.subtitle}>
              Pramukh controls for bill payouts & member refunds
            </SproutText>
          </View>
        </View>

        {collapsed ? (
          <ChevronDown size={18} color={colors.muted} />
        ) : (
          <ChevronUp size={18} color={colors.muted} />
        )}
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.content}>
          {/* Section 1: Landlord Rent Disbursal */}
          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Building2 size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <SproutText style={styles.subCardTitle} weight="700">
                Landlord Rent Payout
              </SproutText>
            </View>

            <View style={styles.rentRow}>
              <View>
                <SproutText style={styles.rentAmount} weight="700">
                  {formatCurrencyExact(rentAmount)}
                </SproutText>
                <SproutText style={styles.rentMeta}>
                  Status: {isRentDisbursed ? 'Cleared from Pooled Funds' : 'Pending Payment'}
                </SproutText>
              </View>

              {isRentDisbursed ? (
                <View style={styles.clearedBadge}>
                  <CheckCircle2 size={14} color={colors.positive} style={{ marginRight: 4 }} />
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
              {pendingCollections.map((m) => (
                <View key={m.user_id} style={styles.itemRow}>
                  <View>
                    <SproutText style={styles.itemName} weight="600">
                      {m.display_name}
                    </SproutText>
                    <SproutText style={styles.itemSub}>
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
            </View>
          )}

          {/* Section 3: Pending Refunds */}
          {pendingRefunds.length > 0 && (
            <View style={styles.subCard}>
              <View style={styles.subCardHeader}>
                <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <SproutText style={styles.subCardTitle} weight="700">
                  Pending Member Reimbursements ({pendingRefunds.length})
                </SproutText>
              </View>
              {pendingRefunds.map((m) => (
                <View key={m.user_id} style={styles.itemRow}>
                  <View>
                    <SproutText style={styles.itemName} weight="600">
                      {m.display_name}
                    </SproutText>
                    <SproutText style={styles.itemSub}>
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
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <SproutText style={styles.actionBtnText} weight="700">
                        Disburse Refund
                      </SproutText>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Section 4: Lock Month & Rollover */}
          <View style={styles.lockCard}>
            <View style={styles.lockRow}>
              <Lock size={16} color={isLocked ? colors.muted : colors.text} style={{ marginRight: 6 }} />
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
                  <SproutText style={styles.actionBtnText} weight="700">
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
    backgroundColor: '#FAF8F4',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E7DFCA',
  },
  containerDark: {
    backgroundColor: '#1E2520',
    borderColor: '#374238',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamilies.interface,
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  content: {
    marginTop: spacing.md,
  },
  subCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fontFamilies.interface,
  },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rentAmount: {
    fontSize: 18,
    fontFamily: fontFamilies.numeric,
    color: colors.text,
  },
  rentMeta: {
    fontSize: 10,
    color: colors.muted,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    marginTop: 4,
  },
  itemName: {
    fontSize: 13,
    color: colors.text,
  },
  itemSub: {
    fontSize: 10,
    color: colors.muted,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentActionBtn: {
    backgroundColor: colors.accent,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
  },
  refundActionBtn: {
    backgroundColor: colors.positive,
  },
  lockBtn: {
    backgroundColor: colors.clay,
    marginTop: spacing.sm,
  },
  actionBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: fontFamilies.interface,
  },
  clearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF6EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  clearedText: {
    fontSize: 11,
    color: colors.positive,
    fontFamily: fontFamilies.numeric,
  },
  lockCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 13,
    color: colors.text,
  },
  lockSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
