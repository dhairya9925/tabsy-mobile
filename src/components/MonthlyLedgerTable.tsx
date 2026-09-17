import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { MemberLedgerItem, MonthlyLedgerSummary } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface MonthlyLedgerTableProps {
  members: MemberLedgerItem[];
  summary: MonthlyLedgerSummary | null;
  currentUserId?: string;
  isCoordinator?: boolean;
  onConfirmContribution?: (member: MemberLedgerItem) => void;
  onDisburseRefund?: (member: MemberLedgerItem) => void;
}

export const MonthlyLedgerTable: React.FC<MonthlyLedgerTableProps> = ({
  members,
  summary,
  currentUserId,
  isCoordinator = false,
  onConfirmContribution,
  onDisburseRefund,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const getStatusBadge = (item: MemberLedgerItem) => {
    switch (item.status) {
      case 'confirmed':
        return {
          label: 'Confirmed ✓',
          bg: '#EBF6EE',
          text: colors.positive,
        };
      case 'refunded':
        return {
          label: 'Refunded ✓',
          bg: '#EAF3FF',
          text: '#1C5BBA',
        };
      case 'submitted':
        return {
          label: 'Pending Verification',
          bg: '#FDF5EB',
          text: colors.clay,
        };
      case 'pending':
      default:
        return item.balance <= 0
          ? { label: 'Settled', bg: '#F0F4EE', text: colors.muted }
          : { label: 'Unpaid', bg: '#FDF1EE', text: colors.negative };
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, shadows.card]}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <SproutText style={styles.tableTitle} weight="700">
          Household Ledger
        </SproutText>
        <SproutText style={styles.tableCount}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </SproutText>
      </View>

      {/* Member Rows */}
      <View style={styles.listContainer}>
        {members.map((item, index) => {
          const isMe = item.user_id === currentUserId;
          const isExpanded = expandedUserId === item.user_id;
          const isOverpaid = item.balance < 0;
          const isCleared = item.balance === 0;
          const isLead = item.role === 'admin' || item.role === 'coordinator';
          const statusBadge = getStatusBadge(item);

          return (
            <View
              key={item.user_id}
              style={[
                styles.memberCard,
                isDark && styles.memberCardDark,
                index === members.length - 1 && styles.lastCard,
              ]}
            >
              {/* Main Member Row */}
              <TouchableOpacity
                style={styles.rowClickable}
                onPress={() => toggleExpand(item.user_id)}
                activeOpacity={0.7}
              >
                <View style={styles.leftCol}>
                  <AvatarCircle name={item.display_name} size={36} />
                  <View style={styles.nameBlock}>
                    <View style={styles.nameLine}>
                      <SproutText style={styles.memberName} weight="700" numberOfLines={1}>
                        {item.display_name}
                      </SproutText>
                      {isMe && (
                        <View style={styles.youBadge}>
                          <SproutText style={styles.youBadgeText}>YOU</SproutText>
                        </View>
                      )}
                      {isLead && (
                        <View style={styles.coordBadge}>
                          <SproutText style={styles.coordBadgeText}>LEAD</SproutText>
                        </View>
                      )}
                    </View>
                    <SproutText style={styles.obligationSubtext}>
                      Paid: {formatCurrencyExact(item.total_paid)} / Exp:{' '}
                      {formatCurrencyExact(item.total_expense)}
                    </SproutText>
                  </View>
                </View>

                {/* Right Column: Balance Pill & Expand Chevron */}
                <View style={styles.rightCol}>
                  <View
                    style={[
                      styles.balancePill,
                      isOverpaid && styles.overpaidPill,
                      isCleared && styles.clearedPill,
                    ]}
                  >
                    <SproutText
                      style={[
                        styles.balancePillText,
                        isOverpaid && styles.overpaidPillText,
                        isCleared && styles.clearedPillText,
                      ]}
                      weight="700"
                    >
                      {isCleared
                        ? 'Cleared'
                        : isOverpaid
                        ? `+${formatCurrencyExact(Math.abs(item.balance))}`
                        : `-${formatCurrencyExact(item.balance)}`}
                    </SproutText>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color={colors.muted} style={{ marginLeft: 4 }} />
                  ) : (
                    <ChevronDown size={16} color={colors.muted} style={{ marginLeft: 4 }} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Expanded Breakdown Accordion */}
              {isExpanded && (
                <View style={[styles.accordionBox, isDark && styles.accordionBoxDark]}>
                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionLabel}>Rent Share (Ceil):</SproutText>
                    <SproutText style={styles.accordionValue}>
                      {formatCurrencyExact(item.rent_share)}
                    </SproutText>
                  </View>
                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionLabel}>Shared Expenses:</SproutText>
                    <SproutText style={styles.accordionValue}>
                      {formatCurrencyExact(item.expense_share)}
                    </SproutText>
                  </View>
                  {item.adjustments > 0 && (
                    <View style={styles.accordionRow}>
                      <SproutText style={styles.accordionLabel}>Adjustments:</SproutText>
                      <SproutText style={styles.accordionValue}>
                        {formatCurrencyExact(item.adjustments)}
                      </SproutText>
                    </View>
                  )}
                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionLabel}>Total Obligation:</SproutText>
                    <SproutText style={styles.accordionValue} weight="600">
                      {formatCurrencyExact(item.total_expense)}
                    </SproutText>
                  </View>
                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionLabel}>Total Paid / Fronted:</SproutText>
                    <SproutText style={[styles.accordionValue, { color: colors.accent }]} weight="600">
                      {formatCurrencyExact(item.total_paid)}
                    </SproutText>
                  </View>

                  <View style={styles.accordionDivider} />

                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionNetLabel} weight="700">
                      {isOverpaid ? 'Refund Due to Member:' : 'Remaining to Pay:'}
                    </SproutText>
                    <SproutText
                      style={[
                        styles.accordionNetValue,
                        isOverpaid ? { color: colors.positive } : { color: colors.clay },
                      ]}
                      weight="700"
                    >
                      {formatCurrencyExact(Math.abs(item.balance))}
                    </SproutText>
                  </View>

                  {/* Status Indicator */}
                  <View style={styles.accordionStatusRow}>
                    <View style={[styles.statusChip, { backgroundColor: statusBadge.bg }]}>
                      <SproutText style={[styles.statusChipText, { color: statusBadge.text }]}>
                        {statusBadge.label}
                      </SproutText>
                    </View>

                    {/* Coordinator Fast Actions */}
                    {isCoordinator && item.balance > 0 && item.status !== 'confirmed' && (
                      <TouchableOpacity
                        style={styles.actionPillBtn}
                        onPress={() => onConfirmContribution?.(item)}
                        activeOpacity={0.7}
                      >
                        <SproutText style={styles.actionPillBtnText} weight="700">
                          Confirm Received
                        </SproutText>
                      </TouchableOpacity>
                    )}

                    {isCoordinator && isOverpaid && item.status !== 'refunded' && (
                      <TouchableOpacity
                        style={[styles.actionPillBtn, styles.refundBtn]}
                        onPress={() => onDisburseRefund?.(item)}
                        activeOpacity={0.7}
                      >
                        <SproutText style={styles.actionPillBtnText} weight="700">
                          Mark Refunded
                        </SproutText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Summary Footer Card */}
      {summary && (
        <View style={[styles.summaryFooter, isDark && styles.summaryFooterDark]}>
          <SproutText style={styles.summaryTitle} weight="700">
            Monthly Clearing Totals
          </SproutText>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Expected In</SproutText>
              <SproutText style={styles.summaryValue} weight="700">
                {formatCurrencyExact(summary.grand_total)}
              </SproutText>
            </View>

            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Collected</SproutText>
              <SproutText style={[styles.summaryValue, { color: colors.accent }]} weight="700">
                {formatCurrencyExact(summary.total_paid)}
              </SproutText>
            </View>

            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Refunds Due</SproutText>
              <SproutText style={[styles.summaryValue, { color: colors.positive }]} weight="700">
                {formatCurrencyExact(summary.over_contributed)}
              </SproutText>
            </View>

            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Bills Pool</SproutText>
              <SproutText style={[styles.summaryValue, { color: colors.clay }]} weight="700">
                {formatCurrencyExact(summary.remaining_for_bills)}
              </SproutText>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  containerDark: {
    backgroundColor: '#1E2C24',
    borderColor: '#2D3F34',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fontFamilies.interface,
  },
  tableCount: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fontFamilies.numeric,
  },
  listContainer: {
    marginVertical: spacing.xs,
  },
  memberCard: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  memberCardDark: {
    borderBottomColor: '#2D3F34',
  },
  lastCard: {
    borderBottomWidth: 0,
  },
  rowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameBlock: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamilies.interface,
    maxWidth: 130,
  },
  youBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.sm,
    marginLeft: 6,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: fontFamilies.numeric,
  },
  coordBadge: {
    backgroundColor: '#F7E7CD',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.sm,
    marginLeft: 4,
  },
  coordBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.clay,
    fontFamily: fontFamilies.numeric,
  },
  obligationSubtext: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontFamily: fontFamilies.numeric,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balancePill: {
    backgroundColor: '#FDF5EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  balancePillText: {
    fontSize: 11,
    color: colors.clay,
    fontFamily: fontFamilies.numeric,
  },
  overpaidPill: {
    backgroundColor: '#EBF6EE',
  },
  overpaidPillText: {
    color: colors.positive,
  },
  clearedPill: {
    backgroundColor: '#F0F4EE',
  },
  clearedPillText: {
    color: colors.muted,
  },
  accordionBox: {
    backgroundColor: '#F8FAF6',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  accordionBoxDark: {
    backgroundColor: '#16231B',
    borderColor: '#2D3F34',
  },
  accordionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  accordionLabel: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fontFamilies.interface,
  },
  accordionValue: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fontFamilies.numeric,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  accordionNetLabel: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fontFamilies.interface,
  },
  accordionNetValue: {
    fontSize: 12,
    fontFamily: fontFamilies.numeric,
  },
  accordionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: 4,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamilies.numeric,
  },
  actionPillBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  refundBtn: {
    backgroundColor: colors.positive,
  },
  actionPillBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: fontFamilies.interface,
  },
  summaryFooter: {
    backgroundColor: '#F3F6F0',
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryFooterDark: {
    backgroundColor: '#16231B',
  },
  summaryTitle: {
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: fontFamilies.numeric,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: fontFamilies.interface,
  },
  summaryValue: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fontFamilies.numeric,
    marginTop: 2,
  },
});
