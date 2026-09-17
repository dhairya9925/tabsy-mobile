import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

/** Elegant SVG Donut Progress Dial (Echoes Rhythm MonthlyPaceCard) */
interface CircularProgressDialProps {
  percentage: number;
  size?: number;
  label?: string;
  fillColor?: string;
}

const CircularProgressDial: React.FC<CircularProgressDialProps> = ({
  percentage,
  size = 50,
  label = 'COLLECTED',
  fillColor = colors.sun,
}) => {
  const strokeWidth = 4;
  const r = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={dialStyles.container}>
      <View style={[dialStyles.ringContainer, { width: size, height: size, borderRadius: r }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track Circle */}
          <Circle
            cx={r}
            cy={r}
            r={radius}
            stroke="#264335"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Arc */}
          {clamped > 0 && (
            <Circle
              cx={r}
              cy={r}
              r={radius}
              stroke={fillColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${r} ${r})`}
              fill="transparent"
            />
          )}
        </Svg>
        <View style={dialStyles.ringTextWrap}>
          <SproutText style={dialStyles.ringNumber} weight="800">
            {clamped}
          </SproutText>
          <SproutText style={dialStyles.ringPercent} weight="700">
            %
          </SproutText>
        </View>
      </View>
      <SproutText style={dialStyles.dialSublabel} weight="700">
        {label}
      </SproutText>
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

  /** Unified status footer with clearance ratio and landlord rent status */
  const renderStatusBar = () => {
    if (!summary) return null;

    const {
      members_to_contribute = 0,
      bill_progress_pct = 0,
    } = summary;

    const pendingCount = coordinatorSummary?.members_to_collect?.length ?? 0;
    const settledCount = Math.max(0, totalMembers - pendingCount);

    const rentBill = coordinatorSummary?.external_bills_pending?.find(
      (b) => b.category === 'rent' || b.category === 'landlord_rent'
    );
    const isRentCleared = rentBill ? rentBill.status === 'cleared' : bill_progress_pct >= 100;

    return (
      <View style={styles.statusBar}>
        <View style={styles.statusItemLeft}>
          <Users size={11} color="#BDCABF" style={{ marginRight: 4 }} />
          <SproutText style={styles.statusTextLeft} numberOfLines={1}>
            {totalMembers > 0 ? `${settledCount}/${totalMembers} cleared` : 'All flatmates'}
            {members_to_contribute > 0 && ` · ₹${Math.round(members_to_contribute / 1000)}k left`}
          </SproutText>
        </View>

        <View style={styles.statusItemRight}>
          <Building2 size={11} color="#BDCABF" style={{ marginRight: 4 }} />
          <SproutText style={styles.statusLabelRight}>Rent:</SproutText>
          <View
            style={[
              styles.rentPill,
              isRentCleared ? styles.rentPillCleared : styles.rentPillPending,
            ]}
          >
            {isRentCleared ? (
              <CheckCircle2 size={9} color="#183228" style={{ marginRight: 2 }} />
            ) : (
              <AlertCircle size={9} color="#183228" style={{ marginRight: 2 }} />
            )}
            <SproutText style={styles.rentPillText} weight="700">
              {isRentCleared ? 'Paid' : 'Pending'}
            </SproutText>
          </View>
        </View>
      </View>
    );
  };

  // 1. DEBTOR STATE: Member owes rent/expenses to coordinator
  if (action === 'pay_coordinator') {
    return (
      <View style={[styles.card, shadows.card]}>
        {/* Header Eyebrow Row */}
        <View style={styles.cardHeader}>
          <SproutText style={styles.headerBadgeText} weight="800">
            {monthName.toUpperCase()} DUES
          </SproutText>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SproutText style={styles.breakdownToggleText} weight="700">
              {showBreakdown ? 'Hide details' : 'Details'}
            </SproutText>
            {showBreakdown ? (
              <ChevronUp size={12} color="#BDCABF" />
            ) : (
              <ChevronDown size={12} color="#BDCABF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Body Row: Left = Due info, Right = Circular Dial */}
        <View style={styles.heroBodyRow}>
          <View style={styles.heroLeftCol}>
            <SproutText style={styles.amountEyebrow} weight="800">
              YOU NEED TO PAY
            </SproutText>
            <SproutText style={styles.amountValue} weight="800">
              {formatCurrencyExact(amount)}
            </SproutText>
            <SproutText style={styles.recipientText} numberOfLines={1}>
              to <SproutText style={styles.recipientName} weight="700">{coordinator_name || 'Coordinator'}</SproutText>
            </SproutText>
          </View>

          {summary && (
            <CircularProgressDial
              percentage={summary.collection_progress_pct || 0}
              size={50}
              label="COLLECTED"
              fillColor={colors.sun}
            />
          )}
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
              <ExternalLink size={13} color="#183228" style={{ marginRight: 5 }} />
              <SproutText style={styles.upiBtnText} weight="700">
                Pay via UPI
              </SproutText>
            </TouchableOpacity>
          )}

          {isAlreadySubmitted ? (
            <View style={styles.submittedStatusBox}>
              <Clock size={13} color="#D8E8CB" style={{ marginRight: 5 }} />
              <SproutText style={styles.submittedStatusText} weight="700">
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

        {/* Unified Bottom Status Bar */}
        {renderStatusBar()}
      </View>
    );
  }

  // 2. CREDITOR STATE: Roommate over-contributed and gets a refund
  if (action === 'receive_refund') {
    const isRefunded = status === 'refunded';

    return (
      <View style={[styles.card, shadows.card]}>
        {/* Header Eyebrow Row */}
        <View style={styles.cardHeader}>
          <SproutText style={styles.headerBadgeText} weight="800">
            {isRefunded ? 'REFUND SETTLED ✓' : `${monthName.toUpperCase()} REFUND`}
          </SproutText>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SproutText style={styles.breakdownToggleText} weight="700">
              {showBreakdown ? 'Hide details' : 'Details'}
            </SproutText>
            {showBreakdown ? (
              <ChevronUp size={12} color="#BDCABF" />
            ) : (
              <ChevronDown size={12} color="#BDCABF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Body Row */}
        <View style={styles.heroBodyRow}>
          <View style={styles.heroLeftCol}>
            <SproutText style={styles.amountEyebrow} weight="800">
              {isRefunded ? 'REFUND DISBURSED' : 'YOU ARE OWED A REFUND'}
            </SproutText>
            <SproutText style={[styles.amountValue, { color: '#D8E8CB' }]} weight="800">
              +{formatCurrencyExact(amount)}
            </SproutText>
            <SproutText style={styles.recipientText} numberOfLines={1}>
              {isRefunded
                ? 'Disbursed by coordinator'
                : `from ${coordinator_name || 'Coordinator'}`}
            </SproutText>
          </View>

          {summary && (
            <CircularProgressDial
              percentage={summary.collection_progress_pct || 0}
              size={50}
              label="COLLECTED"
              fillColor="#D8E8CB"
            />
          )}
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

        {/* Unified Bottom Status Bar */}
        {renderStatusBar()}
      </View>
    );
  }

  // 3. SETTLED STATE: All squared away
  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.heroBodyRow}>
        <View style={styles.settledRow}>
          <View style={styles.settledIconCircle}>
            <CheckCircle2 size={20} color="#D8E8CB" />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <SproutText style={styles.settledTitle} weight="800">
              {monthName} {year} All Squared Away
            </SproutText>
            <SproutText style={styles.settledSubtitle}>
              Your share of rent and expenses is completely cleared.
            </SproutText>
          </View>
        </View>

        {summary && (
          <CircularProgressDial
            percentage={summary.collection_progress_pct || 100}
            size={50}
            label="COLLECTED"
            fillColor="#D8E8CB"
          />
        )}
      </View>

      {/* Unified Bottom Status Bar */}
      {renderStatusBar()}
    </View>
  );
};

/* ---------- Circular Dial Styles ---------- */
const dialStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  ringContainer: {
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNumber: {
    fontSize: 13,
    fontFamily: fontFamilies.extraBold,
    color: '#F6F7ED',
    lineHeight: 15,
    includeFontPadding: false,
  },
  ringPercent: {
    fontSize: 7.5,
    fontFamily: fontFamilies.bold,
    color: '#BDCABF',
    marginTop: -2,
    includeFontPadding: false,
  },
  dialSublabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    color: '#BDCABF',
    marginTop: 2,
    textTransform: 'uppercase',
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
    marginHorizontal: 0,
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
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
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#BDCABF',
    marginRight: 2,
  },
  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 6,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 6,
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
    color: colors.sun, // Warm gold #F0BF67
    letterSpacing: -0.8,
    includeFontPadding: false,
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
    marginBottom: 6,
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
    marginBottom: 3,
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(203, 215, 204, 0.18)',
    marginTop: 6,
    paddingTop: 6,
  },
  statusItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  statusTextLeft: {
    fontSize: 9.5,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
    flexShrink: 1,
  },
  statusItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusLabelRight: {
    fontSize: 9.5,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
    marginRight: 3,
  },
  rentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  rentPillCleared: {
    backgroundColor: '#D8E8CB',
  },
  rentPillPending: {
    backgroundColor: colors.clay, // Soft peach beige #F4DACD
  },
  rentPillText: {
    fontSize: 8.5,
    fontFamily: fontFamilies.bold,
    color: '#183228',
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settledIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(216, 232, 203, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  settledTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
  },
  settledSubtitle: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    color: '#BDCABF',
    marginTop: 1,
  },
});
