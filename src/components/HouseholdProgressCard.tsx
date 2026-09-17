import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../theme';
import { SproutText } from './SproutText';
import { MonthlyLedgerSummary, CoordinatorChecklist } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import { Users, Building2, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface HouseholdProgressCardProps {
  summary: MonthlyLedgerSummary | null;
  coordinatorSummary?: CoordinatorChecklist | null;
  totalMembers?: number;
}

export const HouseholdProgressCard: React.FC<HouseholdProgressCardProps> = ({
  summary,
  coordinatorSummary,
  totalMembers = 0,
}) => {
  const isDark = useThemeStore((s) => s.isDark);

  if (!summary) {
    return null;
  }

  const {
    collection_progress_pct = 0,
    bill_progress_pct = 0,
    total_paid = 0,
    members_to_contribute = 0,
    remaining_for_bills = 0,
    total_rent = 0,
    total_vendor_bills_paid = 0,
  } = summary;

  const pendingMembersCount = coordinatorSummary?.members_to_collect?.length ?? 0;
  const settledMembersCount = Math.max(0, totalMembers - pendingMembersCount);

  const rentBill = coordinatorSummary?.external_bills_pending?.find(
    (b) => b.category === 'rent' || b.category === 'landlord_rent'
  );
  const isRentCleared = rentBill ? rentBill.status === 'cleared' : bill_progress_pct >= 100;

  const clampedCollectionPct = Math.min(100, Math.max(0, Math.round(collection_progress_pct)));
  const clampedBillPct = Math.min(100, Math.max(0, Math.round(bill_progress_pct)));

  return (
    <View style={[styles.card, isDark && styles.cardDark, shadows.card]}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <SproutText style={styles.eyebrow}>HOUSEHOLD CLEARING STATUS</SproutText>
        {totalMembers > 0 && (
          <SproutText style={styles.memberRatioText}>
            {settledMembersCount} of {totalMembers} members cleared
          </SproutText>
        )}
      </View>

      {/* Gauge 1: Roommate Collections */}
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeHeader}>
          <View style={styles.gaugeTitleRow}>
            <Users size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <SproutText style={styles.gaugeTitle} weight="700">
              Roommate Collections
            </SproutText>
          </View>
          <SproutText style={styles.gaugePercent} weight="700">
            {clampedCollectionPct}%
          </SproutText>
        </View>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${clampedCollectionPct}%`,
                backgroundColor: clampedCollectionPct === 100 ? colors.positive : colors.accent,
              },
            ]}
          />
        </View>

        <View style={styles.gaugeFooter}>
          <SproutText style={styles.gaugeSubtext}>
            Collected:{' '}
            <SproutText style={styles.numericValue} weight="600">
              {formatCurrencyExact(total_paid)}
            </SproutText>
          </SproutText>
          {members_to_contribute > 0 && (
            <SproutText style={styles.uncollectedText}>
              {formatCurrencyExact(members_to_contribute)} left
            </SproutText>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Gauge 2: External Bills (Landlord Rent / Utilities) */}
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeHeader}>
          <View style={styles.gaugeTitleRow}>
            <Building2 size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <SproutText style={styles.gaugeTitle} weight="700">
              External Bills & Landlord Rent
            </SproutText>
          </View>
          <View style={styles.statusBadge}>
            {isRentCleared ? (
              <CheckCircle2 size={12} color={colors.positive} style={{ marginRight: 4 }} />
            ) : (
              <AlertCircle size={12} color={colors.clay} style={{ marginRight: 4 }} />
            )}
            <SproutText
              style={[
                styles.statusBadgeText,
                { color: isRentCleared ? colors.positive : colors.clay },
              ]}
              weight="700"
            >
              {isRentCleared ? 'Rent Paid' : 'Rent Pending'}
            </SproutText>
          </View>
        </View>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${clampedBillPct}%`,
                backgroundColor: isRentCleared ? colors.positive : colors.clay,
              },
            ]}
          />
        </View>

        <View style={styles.gaugeFooter}>
          <SproutText style={styles.gaugeSubtext}>
            Disbursed:{' '}
            <SproutText style={styles.numericValue} weight="600">
              {formatCurrencyExact(total_vendor_bills_paid)}
            </SproutText>{' '}
            of {formatCurrencyExact(total_rent)}
          </SproutText>
          <SproutText style={styles.gaugeSubtext}>
            Pool reserve:{' '}
            <SproutText style={styles.numericValue} weight="600">
              {formatCurrencyExact(remaining_for_bills)}
            </SproutText>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    fontFamily: fontFamilies.numeric,
    letterSpacing: 0.6,
  },
  memberRatioText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    fontFamily: fontFamilies.interface,
  },
  gaugeContainer: {
    marginVertical: spacing.xs,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gaugeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeTitle: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fontFamilies.interface,
  },
  gaugePercent: {
    fontSize: 12,
    color: colors.accent,
    fontFamily: fontFamilies.numeric,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  gaugeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  gaugeSubtext: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fontFamilies.interface,
  },
  numericValue: {
    fontFamily: fontFamilies.numeric,
    color: colors.text,
  },
  uncollectedText: {
    fontSize: 11,
    color: colors.clay,
    fontWeight: '600',
    fontFamily: fontFamilies.numeric,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilies.numeric,
  },
});
