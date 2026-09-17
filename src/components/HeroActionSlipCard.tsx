import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../theme';
import { SproutText } from './SproutText';
import { SproutButton } from './SproutButton';
import { UserLedgerActionSummary } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface HeroActionSlipCardProps {
  mySummary: UserLedgerActionSummary | null;
  monthName: string;
  year: number;
  onRecordPaymentPress?: () => void;
  isSubmittingPayment?: boolean;
}

export const HeroActionSlipCard: React.FC<HeroActionSlipCardProps> = ({
  mySummary,
  monthName,
  year,
  onRecordPaymentPress,
  isSubmittingPayment = false,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!mySummary) {
    return null;
  }

  const { action, amount, coordinator_name, status, upi_uri, breakdown } = mySummary;

  const handlePayViaUPI = async () => {
    if (!upi_uri) {
      Alert.alert(
        'UPI ID Unavailable',
        `Coordinator ${coordinator_name || 'Admin'} has not configured a UPI ID yet.`
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(upi_uri);
      if (supported) {
        await Linking.openURL(upi_uri);
      } else {
        Alert.alert(
          'UPI App Not Found',
          `Could not find a supported UPI app on this device. Payment link:\n${upi_uri}`
        );
      }
    } catch {
      Alert.alert('Payment Error', 'Unable to launch UPI app. Please pay manually.');
    }
  };

  // 1. DEBTOR STATE: Roommate owes the coordinator
  if (action === 'pay_coordinator') {
    const isAlreadySubmitted = status === 'submitted';

    return (
      <View style={[styles.card, styles.debtorCard, isDark && styles.cardDark, shadows.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeWrapper}>
            <View style={[styles.statusBadge, styles.debtorBadge]}>
              <SproutText style={styles.statusBadgeText}>
                {isAlreadySubmitted ? 'PAYMENT SUBMITTED' : `${monthName.toUpperCase()} DUES`}
              </SproutText>
            </View>
          </View>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown((prev) => !prev)}
            activeOpacity={0.7}
          >
            <SproutText style={styles.breakdownToggleText}>
              {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
            </SproutText>
            {showBreakdown ? (
              <ChevronUp size={14} color={colors.accent} />
            ) : (
              <ChevronDown size={14} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.amountSection}>
          <SproutText style={styles.amountLabel}>You need to pay</SproutText>
          <SproutText style={[styles.amountText, styles.debtorAmount]} weight="700">
            {formatCurrencyExact(amount)}
          </SproutText>
          <SproutText style={styles.recipientText}>
            to <SproutText weight="700">{coordinator_name || 'Coordinator'}</SproutText>
          </SproutText>
        </View>

        {showBreakdown && breakdown && (
          <View style={[styles.breakdownContainer, isDark && styles.breakdownContainerDark]}>
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Rent share (ceil rounded):</SproutText>
              <SproutText style={styles.breakdownValue}>
                +{formatCurrencyExact(breakdown.rent_share)}
              </SproutText>
            </View>
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Shared expenses:</SproutText>
              <SproutText style={styles.breakdownValue}>
                +{formatCurrencyExact(breakdown.expense_share)}
              </SproutText>
            </View>
            {breakdown.adjustments > 0 && (
              <View style={styles.breakdownRow}>
                <SproutText style={styles.breakdownLabel}>Individual adjustments:</SproutText>
                <SproutText style={styles.breakdownValue}>
                  +{formatCurrencyExact(breakdown.adjustments)}
                </SproutText>
              </View>
            )}
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Less already paid / fronted:</SproutText>
              <SproutText style={[styles.breakdownValue, { color: colors.accent }]}>
                -{formatCurrencyExact(breakdown.already_paid)}
              </SproutText>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
              <SproutText style={styles.breakdownTotalLabel} weight="700">
                Outstanding balance:
              </SproutText>
              <SproutText style={styles.breakdownTotalValue} weight="700">
                {formatCurrencyExact(amount)}
              </SproutText>
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          {upi_uri && !isAlreadySubmitted && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.upiBtn]}
              onPress={handlePayViaUPI}
              activeOpacity={0.8}
            >
              <ExternalLink size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <SproutText style={styles.upiBtnText} weight="700">
                Pay via UPI
              </SproutText>
            </TouchableOpacity>
          )}

          {isAlreadySubmitted ? (
            <View style={styles.submittedStatusBox}>
              <Clock size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <SproutText style={styles.submittedStatusText}>
                Payment submitted · Awaiting confirmation
              </SproutText>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.paidBtn]}
              onPress={onRecordPaymentPress}
              disabled={isSubmittingPayment}
              activeOpacity={0.8}
            >
              {isSubmittingPayment ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <SproutText style={styles.paidBtnText} weight="700">
                  I've Paid
                </SproutText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // 2. CREDITOR STATE: Roommate over-contributed and gets a refund
  if (action === 'receive_refund') {
    const isRefunded = status === 'refunded';

    return (
      <View style={[styles.card, styles.creditorCard, isDark && styles.cardDark, shadows.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeWrapper}>
            <View style={[styles.statusBadge, styles.creditorBadge]}>
              <SproutText style={styles.statusBadgeText}>
                {isRefunded ? 'REFUND RECEIVED ✓' : `${monthName.toUpperCase()} REIMBURSEMENT`}
              </SproutText>
            </View>
          </View>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown((prev) => !prev)}
            activeOpacity={0.7}
          >
            <SproutText style={styles.breakdownToggleText}>
              {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
            </SproutText>
            {showBreakdown ? (
              <ChevronUp size={14} color={colors.accent} />
            ) : (
              <ChevronDown size={14} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.amountSection}>
          <SproutText style={styles.amountLabel}>You get back</SproutText>
          <SproutText style={[styles.amountText, styles.creditorAmount]} weight="700">
            {formatCurrencyExact(amount)}
          </SproutText>
          <SproutText style={styles.recipientText}>
            from <SproutText weight="700">{coordinator_name || 'Coordinator'}</SproutText>
          </SproutText>
        </View>

        <View style={styles.creditorNoteBox}>
          <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
          <SproutText style={styles.creditorNoteText}>
            {isRefunded
              ? 'Your refund has been disbursed by the coordinator.'
              : `You fronted expenses for the flat! ${coordinator_name || 'Coordinator'} will reimburse you once collections complete.`}
          </SproutText>
        </View>

        {showBreakdown && breakdown && (
          <View style={[styles.breakdownContainer, isDark && styles.breakdownContainerDark]}>
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Rent share (ceil rounded):</SproutText>
              <SproutText style={styles.breakdownValue}>
                +{formatCurrencyExact(breakdown.rent_share)}
              </SproutText>
            </View>
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Shared expenses:</SproutText>
              <SproutText style={styles.breakdownValue}>
                +{formatCurrencyExact(breakdown.expense_share)}
              </SproutText>
            </View>
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Total fronted by you:</SproutText>
              <SproutText style={[styles.breakdownValue, { color: colors.positive }]}>
                {formatCurrencyExact(breakdown.already_paid)}
              </SproutText>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
              <SproutText style={styles.breakdownTotalLabel} weight="700">
                Overpayment / Refund:
              </SproutText>
              <SproutText style={[styles.breakdownTotalValue, { color: colors.positive }]} weight="700">
                {formatCurrencyExact(amount)}
              </SproutText>
            </View>
          </View>
        )}
      </View>
    );
  }

  // 3. SETTLED STATE: All squared away
  return (
    <View style={[styles.card, styles.settledCard, isDark && styles.cardDark, shadows.card]}>
      <View style={styles.settledRow}>
        <View style={styles.settledIconCircle}>
          <CheckCircle2 size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <SproutText style={styles.settledTitle} weight="700">
            {monthName} {year} All Squared Away
          </SproutText>
          <SproutText style={styles.settledSubtitle}>
            Your share of rent and expenses is completely cleared.
          </SproutText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardDark: {
    backgroundColor: '#1E2C24',
    borderColor: '#2D3F34',
  },
  debtorCard: {
    backgroundColor: '#FDFCF7',
    borderColor: '#E7DFCA',
  },
  creditorCard: {
    backgroundColor: '#F6FBF6',
    borderColor: '#D4EAD6',
  },
  settledCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeWrapper: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  debtorBadge: {
    backgroundColor: '#F5E6CE',
  },
  creditorBadge: {
    backgroundColor: colors.soft,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamilies.numeric,
    letterSpacing: 0.5,
    color: colors.text,
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownToggleText: {
    fontSize: 12,
    color: colors.accent,
    marginRight: 2,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountText: {
    fontSize: 34,
    fontFamily: fontFamilies.numeric,
    letterSpacing: -0.5,
  },
  debtorAmount: {
    color: colors.negative,
  },
  creditorAmount: {
    color: colors.accent,
  },
  recipientText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  breakdownContainer: {
    backgroundColor: '#F3F6F1',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  breakdownContainerDark: {
    backgroundColor: '#16231B',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  breakdownValue: {
    fontSize: 12,
    fontFamily: fontFamilies.numeric,
    color: colors.text,
  },
  breakdownTotalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    marginTop: 4,
    paddingTop: 6,
  },
  breakdownTotalLabel: {
    fontSize: 12,
    color: colors.text,
  },
  breakdownTotalValue: {
    fontSize: 13,
    fontFamily: fontFamilies.numeric,
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiBtn: {
    backgroundColor: colors.accent,
  },
  upiBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paidBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  paidBtnText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  submittedStatusBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    height: 44,
  },
  submittedStatusText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  creditorNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  creditorNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settledIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settledTitle: {
    fontSize: 15,
    color: colors.text,
  },
  settledSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
