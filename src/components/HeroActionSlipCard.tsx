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
import { UserLedgerActionSummary, MonthlyLedgerSummary, CoordinatorChecklist } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Building2,
} from 'lucide-react-native';

export interface HeroActionSlipCardProps {
  mySummary: UserLedgerActionSummary | null;
  monthName: string;
  year: number;
  onRecordPaymentPress?: () => void;
  isSubmittingPayment?: boolean;
  summary?: MonthlyLedgerSummary | null;
  coordinatorSummary?: CoordinatorChecklist | null;
  totalMembers?: number;
}

/** Compact inline progress strip embedded within the Hero card */
const ProgressStrip: React.FC<{
  summary: MonthlyLedgerSummary;
  coordinatorSummary?: CoordinatorChecklist | null;
  totalMembers: number;
}> = ({ summary, coordinatorSummary, totalMembers }) => {
  const {
    collection_progress_pct = 0,
    total_paid = 0,
    members_to_contribute = 0,
    total_rent = 0,
    bill_progress_pct = 0,
  } = summary;

  const pendingCount = coordinatorSummary?.members_to_collect?.length ?? 0;
  const settledCount = Math.max(0, totalMembers - pendingCount);

  const rentBill = coordinatorSummary?.external_bills_pending?.find(
    (b) => b.category === 'rent' || b.category === 'landlord_rent'
  );
  const isRentCleared = rentBill ? rentBill.status === 'cleared' : bill_progress_pct >= 100;

  const clampedPct = Math.min(100, Math.max(0, Math.round(collection_progress_pct)));
  const clampedBillPct = Math.min(100, Math.max(0, Math.round(bill_progress_pct)));

  return (
    <View style={progressStyles.container}>
      {/* Row 1: Collections */}
      <View style={progressStyles.row}>
        <View style={progressStyles.labelRow}>
          <View style={progressStyles.iconTitleRow}>
            <Users size={12} color="#BDCABF" style={{ marginRight: 5 }} />
            <SproutText style={progressStyles.label} weight="600">
              Collections
            </SproutText>
          </View>
          <SproutText style={progressStyles.pct} weight="700">
            {clampedPct}%
          </SproutText>
        </View>

        <View style={progressStyles.barTrack}>
          <View
            style={[
              progressStyles.barFill,
              {
                width: `${clampedPct}%`,
                backgroundColor: colors.sun,
              },
            ]}
          />
        </View>

        <View style={progressStyles.metaRow}>
          <SproutText style={progressStyles.metaLeft}>
            {formatCurrencyExact(total_paid)}
            {members_to_contribute > 0 && (
              <SproutText style={progressStyles.metaMuted}>
                {' '}· {formatCurrencyExact(members_to_contribute)} left
              </SproutText>
            )}
          </SproutText>
          {totalMembers > 0 && (
            <SproutText style={progressStyles.metaRight} weight="700">
              {settledCount}/{totalMembers} cleared
            </SproutText>
          )}
        </View>
      </View>

      {/* Thin divider */}
      <View style={progressStyles.divider} />

      {/* Row 2: Rent / Bills */}
      <View style={progressStyles.row}>
        <View style={progressStyles.labelRow}>
          <View style={progressStyles.iconTitleRow}>
            <Building2 size={12} color="#BDCABF" style={{ marginRight: 5 }} />
            <SproutText style={progressStyles.label} weight="600">
              Household Rent
            </SproutText>
          </View>
          <View
            style={[
              progressStyles.rentBadge,
              isRentCleared ? progressStyles.rentBadgeCleared : progressStyles.rentBadgePending,
            ]}
          >
            {isRentCleared ? (
              <CheckCircle2 size={10} color="#D8E8CB" style={{ marginRight: 3 }} />
            ) : (
              <AlertCircle size={10} color={colors.text} style={{ marginRight: 3 }} />
            )}
            <SproutText
              style={[
                progressStyles.rentBadgeText,
                { color: isRentCleared ? '#D8E8CB' : colors.text },
              ]}
              weight="700"
            >
              {isRentCleared ? 'Paid' : 'Pending'}
            </SproutText>
          </View>
        </View>

        <View style={progressStyles.barTrack}>
          <View
            style={[
              progressStyles.barFill,
              {
                width: `${clampedBillPct}%`,
                backgroundColor: isRentCleared ? '#D8E8CB' : colors.sun,
              },
            ]}
          />
        </View>

        <View style={progressStyles.metaRow}>
          <SproutText style={progressStyles.metaLeft}>
            {formatCurrencyExact(total_rent)} total rent
          </SproutText>
          <SproutText style={progressStyles.metaRight}>
            {clampedBillPct}% cleared
          </SproutText>
        </View>
      </View>
    </View>
  );
};

export const HeroActionSlipCard: React.FC<HeroActionSlipCardProps> = ({
  mySummary,
  monthName,
  year,
  onRecordPaymentPress,
  isSubmittingPayment = false,
  summary,
  coordinatorSummary,
  totalMembers = 0,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!mySummary) {
    return null;
  }

  const {
    action,
    amount,
    status,
    coordinator_name,
    upi_uri,
    breakdown,
  } = mySummary;

  const isAlreadySubmitted = status === 'paid_pending_confirmation';

  const handlePayViaUPI = async () => {
    if (!upi_uri) {
      Alert.alert('No UPI details', 'Coordinator has not provided a UPI ID.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(upi_uri);
      if (supported) {
        await Linking.openURL(upi_uri);
      } else {
        await Linking.openURL(upi_uri);
      }
    } catch {
      Alert.alert(
        'Unable to open UPI App',
        'Could not automatically launch your UPI app. Please copy the UPI ID and pay via GPay, PhonePe, or Paytm.'
      );
    }
  };

  const renderProgressStrip = () => {
    if (!summary) return null;
    return (
      <ProgressStrip
        summary={summary}
        coordinatorSummary={coordinatorSummary}
        totalMembers={totalMembers}
      />
    );
  };

  // 1. DEBTOR STATE: Member owes rent/expenses to coordinator
  if (action === 'pay_coordinator') {
    return (
      <View style={[styles.card, shadows.card]}>
        {/* Header Eyebrow & Details Toggle */}
        <View style={styles.cardHeader}>
          <View style={styles.headerBadge}>
            <SproutText style={styles.headerBadgeText} weight="800">
              {monthName.toUpperCase()} DUES
            </SproutText>
          </View>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SproutText style={styles.breakdownToggleText} weight="600">
              {showBreakdown ? 'Hide details' : 'Details'}
            </SproutText>
            {showBreakdown ? (
              <ChevronUp size={13} color="#BDCABF" />
            ) : (
              <ChevronDown size={13} color="#BDCABF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Amount Section */}
        <View style={styles.amountSection}>
          <SproutText style={styles.amountEyebrow} weight="800">
            YOU NEED TO PAY
          </SproutText>
          <SproutText style={styles.amountValue} weight="800">
            {formatCurrencyExact(amount)}
          </SproutText>
          <SproutText style={styles.recipientText}>
            to <SproutText style={styles.recipientName} weight="700">{coordinator_name || 'Coordinator'}</SproutText>
          </SproutText>
        </View>

        {/* Expanded Mathematical Breakdown */}
        {showBreakdown && breakdown && (
          <View style={styles.breakdownBox}>
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
                <SproutText style={styles.breakdownLabel}>Adjustments:</SproutText>
                <SproutText style={styles.breakdownValue}>
                  +{formatCurrencyExact(breakdown.adjustments)}
                </SproutText>
              </View>
            )}
            <View style={styles.breakdownRow}>
              <SproutText style={styles.breakdownLabel}>Less already paid / fronted:</SproutText>
              <SproutText style={[styles.breakdownValue, { color: '#D8E8CB' }]}>
                -{formatCurrencyExact(breakdown.already_paid)}
              </SproutText>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
              <SproutText style={styles.breakdownTotalLabel} weight="700">
                Outstanding due:
              </SproutText>
              <SproutText style={styles.breakdownTotalValue} weight="800">
                {formatCurrencyExact(amount)}
              </SproutText>
            </View>
          </View>
        )}

        {/* Tactile Action Buttons */}
        <View style={styles.actionsRow}>
          {upi_uri && !isAlreadySubmitted && (
            <TouchableOpacity
              style={styles.upiBtn}
              onPress={handlePayViaUPI}
              activeOpacity={0.85}
            >
              <ExternalLink size={14} color="#183228" style={{ marginRight: 6 }} />
              <SproutText style={styles.upiBtnText} weight="700">
                Pay via UPI
              </SproutText>
            </TouchableOpacity>
          )}

          {isAlreadySubmitted ? (
            <View style={styles.submittedStatusBox}>
              <Clock size={15} color="#D8E8CB" style={{ marginRight: 6 }} />
              <SproutText style={styles.submittedStatusText} weight="600">
                Payment submitted · Awaiting confirmation
              </SproutText>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.paidBtn}
              onPress={onRecordPaymentPress}
              disabled={isSubmittingPayment}
              activeOpacity={0.85}
            >
              {isSubmittingPayment ? (
                <ActivityIndicator size="small" color="#F6F7ED" />
              ) : (
                <SproutText style={styles.paidBtnText} weight="700">
                  I've Paid
                </SproutText>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Merged Progress Strip */}
        {renderProgressStrip()}
      </View>
    );
  }

  // 2. CREDITOR STATE: Roommate over-contributed and gets a refund
  if (action === 'receive_refund') {
    const isRefunded = status === 'refunded';

    return (
      <View style={[styles.card, shadows.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerBadge}>
            <SproutText style={styles.headerBadgeText} weight="800">
              {isRefunded ? 'REFUND SETTLED ✓' : `${monthName.toUpperCase()} REFUND`}
            </SproutText>
          </View>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown((prev) => !prev)}
            activeOpacity={0.7}
          >
            <SproutText style={styles.breakdownToggleText} weight="600">
              {showBreakdown ? 'Hide details' : 'Details'}
            </SproutText>
            {showBreakdown ? (
              <ChevronUp size={13} color="#BDCABF" />
            ) : (
              <ChevronDown size={13} color="#BDCABF" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.amountSection}>
          <SproutText style={styles.amountEyebrow} weight="800">
            {isRefunded ? 'REFUND DISBURSED' : 'YOU ARE OWED A REFUND'}
          </SproutText>
          <SproutText style={[styles.amountValue, { color: '#D8E8CB' }]} weight="800">
            +{formatCurrencyExact(amount)}
          </SproutText>
          <SproutText style={styles.recipientText}>
            {isRefunded
              ? 'Disbursed by coordinator'
              : `from ${coordinator_name || 'Coordinator'}`}
          </SproutText>
        </View>

        {showBreakdown && breakdown && (
          <View style={styles.breakdownBox}>
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
              <SproutText style={[styles.breakdownValue, { color: '#D8E8CB' }]}>
                {formatCurrencyExact(breakdown.already_paid)}
              </SproutText>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
              <SproutText style={styles.breakdownTotalLabel} weight="700">
                Refund amount:
              </SproutText>
              <SproutText style={[styles.breakdownTotalValue, { color: '#D8E8CB' }]} weight="800">
                {formatCurrencyExact(amount)}
              </SproutText>
            </View>
          </View>
        )}

        {/* Merged Progress Strip */}
        {renderProgressStrip()}
      </View>
    );
  }

  // 3. SETTLED STATE: All squared away
  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.settledRow}>
        <View style={styles.settledIconCircle}>
          <CheckCircle2 size={24} color="#D8E8CB" />
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

      {/* Merged Progress Strip */}
      {renderProgressStrip()}
    </View>
  );
};

/* ---------- Progress strip styles ---------- */
const progressStyles = StyleSheet.create({
  container: {
    backgroundColor: '#132820', // Inset deep forest matching breakdown box
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 9,
    marginTop: 6,
  },
  row: {
    marginVertical: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
  },
  pct: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  barTrack: {
    height: 4,
    borderRadius: radii.full,
    backgroundColor: '#476056', // Ring base from MonthlyPaceCard
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaLeft: {
    fontSize: 9,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
  },
  metaMuted: {
    color: 'rgba(189, 202, 191, 0.7)',
  },
  metaRight: {
    fontSize: 9,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(203, 215, 204, 0.18)',
    marginVertical: 4,
  },
  rentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  rentBadgeCleared: {
    backgroundColor: 'rgba(216, 232, 203, 0.2)',
  },
  rentBadgePending: {
    backgroundColor: colors.clay,
  },
  rentBadgeText: {
    fontSize: 8.5,
    fontFamily: fontFamilies.bold,
  },
});

/* ---------- Card styles ---------- */
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.text, // Signature Deep forest green #183228
    borderTopLeftRadius: 24,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 13,
    marginHorizontal: spacing.md,
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerBadge: {
    paddingVertical: 1,
  },
  headerBadgeText: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    fontFamily: fontFamilies.extraBold,
    textTransform: 'uppercase',
    color: '#BDCABF',
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  breakdownToggleText: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: '#BDCABF',
    marginRight: 2,
  },
  amountSection: {
    alignItems: 'center',
    marginVertical: 2,
  },
  amountEyebrow: {
    fontSize: 7.5,
    lineHeight: 11,
    letterSpacing: 1.2,
    fontFamily: fontFamilies.extraBold,
    textTransform: 'uppercase',
    color: '#BDCABF',
    marginBottom: 2,
    includeFontPadding: false,
  },
  amountValue: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamilies.extraBold,
    color: colors.sun, // Warm gold #F0BF67 — matches MonthlyPaceCard ring accent
    letterSpacing: -0.8,
    includeFontPadding: false,
    textAlign: 'center',
  },
  recipientText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
    marginTop: 2,
    includeFontPadding: false,
  },
  recipientName: {
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  breakdownBox: {
    backgroundColor: '#132820',
    borderRadius: 12,
    padding: 8,
    marginVertical: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    fontSize: 10.5,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
  },
  breakdownValue: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  breakdownTotalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(203, 215, 204, 0.2)',
    marginTop: 3,
    paddingTop: 3,
  },
  breakdownTotalLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  breakdownTotalValue: {
    fontSize: 11,
    fontFamily: fontFamilies.extraBold,
    color: colors.sun,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
    marginBottom: 2,
  },
  upiBtn: {
    flex: 1,
    backgroundColor: colors.sun, // Warm gold matching Rhythm chart/accent
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  upiBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11.5,
    color: '#183228',
  },
  paidBtn: {
    flex: 1,
    backgroundColor: 'rgba(246, 247, 237, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  paidBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11.5,
    color: '#F6F7ED',
  },
  submittedStatusBox: {
    flex: 1,
    backgroundColor: 'rgba(216, 232, 203, 0.18)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedStatusText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10.5,
    color: '#D8E8CB',
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  settledIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    backgroundColor: 'rgba(216, 232, 203, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settledTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  settledSubtitle: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
    marginTop: 2,
  },
});
