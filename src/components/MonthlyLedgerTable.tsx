import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, fontFamilies, shadows } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { MemberLedgerItem, MonthlyLedgerSummary } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showAllMembers, setShowAllMembers] = useState<boolean>(false);

  // When there are more than 5 members, show top 5 unless expanded.
  // Ensure the current user ('YOU') is always included in the initial view.
  const visibleMembers = React.useMemo(() => {
    if (showAllMembers || members.length <= 5) return members;
    const myIndex = members.findIndex((m) => m.user_id === currentUserId);
    if (myIndex >= 5) {
      return [...members.slice(0, 4), members[myIndex]];
    }
    return members.slice(0, 5);
  }, [members, showAllMembers, currentUserId]);

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const getStatusBadge = (item: MemberLedgerItem) => {
    switch (item.status) {
      case 'confirmed':
        return {
          label: 'Confirmed ✓',
          bg: '#D8E8CB',
          text: '#183228',
        };
      case 'refunded':
        return {
          label: 'Refunded ✓',
          bg: '#D8E8CB',
          text: '#183228',
        };
      case 'submitted':
        return {
          label: 'Pending Verification',
          bg: '#F4DACD',
          text: '#183228',
        };
      case 'pending':
      default:
        return item.balance <= 0
          ? { label: 'Settled', bg: colors.background, text: colors.muted }
          : { label: 'Unpaid', bg: '#F4DACD', text: '#183228' };
    }
  };

  return (
    <View style={[styles.container, shadows.card]}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            MEMBERS BREAKDOWN
          </SproutText>
          <SproutText style={styles.tableTitle} weight="800">
            Household Ledger
          </SproutText>
        </View>
        <View style={styles.memberCountBadge}>
          <SproutText style={styles.tableCount} weight="700">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </SproutText>
        </View>
      </View>

      {/* Member Rows */}
      <View style={styles.listContainer}>
        {visibleMembers.map((item, index) => {
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
                index === visibleMembers.length - 1 && (!members.length || showAllMembers || members.length <= 5) && styles.lastCard,
              ]}
            >
              {/* Single-line row */}
              <TouchableOpacity
                style={styles.rowClickable}
                onPress={() => toggleExpand(item.user_id)}
                activeOpacity={0.7}
              >
                <View style={styles.leftCol}>
                  <AvatarCircle name={item.display_name} size={22} />
                  <View style={styles.nameBlock}>
                    <View style={styles.nameLine}>
                      <SproutText
                        style={styles.memberName}
                        weight="700"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.display_name}
                      </SproutText>
                      {isMe && (
                        <View style={styles.youBadge}>
                          <SproutText style={styles.youBadgeText} weight="700">YOU</SproutText>
                        </View>
                      )}
                      {isLead && (
                        <View style={styles.coordBadge}>
                          <SproutText style={styles.coordBadgeText} weight="700">LEAD</SproutText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right: Balance Pill (Echoes Rhythm BalancePillsRow) + Chevron */}
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
                        isCleared && styles.clearedPillText,
                      ]}
                      weight="700"
                    >
                      {isCleared
                        ? '✓ Settled'
                        : isOverpaid
                          ? `+${formatCurrencyExact(Math.abs(item.balance))}`
                          : `-${formatCurrencyExact(item.balance)}`}
                    </SproutText>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={14} color={colors.muted} style={{ marginLeft: 6 }} />
                  ) : (
                    <ChevronDown size={14} color={colors.muted} style={{ marginLeft: 6 }} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Expanded Breakdown Accordion */}
              {isExpanded && (
                <View style={styles.accordionBox}>
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
                    <SproutText style={styles.accordionValue} weight="700">
                      {formatCurrencyExact(item.total_expense)}
                    </SproutText>
                  </View>
                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionLabel}>Paid / Fronted:</SproutText>
                    <SproutText style={[styles.accordionValue, { color: colors.accent }]} weight="700">
                      {formatCurrencyExact(item.total_paid)}
                    </SproutText>
                  </View>

                  <View style={styles.accordionDivider} />

                  <View style={styles.accordionRow}>
                    <SproutText style={styles.accordionNetLabel} weight="700">
                      {isOverpaid ? 'Refund Due:' : 'Net Remaining:'}
                    </SproutText>
                    <SproutText
                      style={[
                        styles.accordionNetValue,
                        isOverpaid ? { color: colors.accent } : { color: colors.text },
                      ]}
                      weight="800"
                    >
                      {formatCurrencyExact(Math.abs(item.balance))}
                    </SproutText>
                  </View>

                  {/* Status + Coordinator Actions */}
                  <View style={styles.accordionStatusRow}>
                    <View style={[styles.statusChip, { backgroundColor: statusBadge.bg }]}>
                      <SproutText style={[styles.statusChipText, { color: statusBadge.text }]} weight="700">
                        {statusBadge.label}
                      </SproutText>
                    </View>

                    {isCoordinator && item.balance > 0 && item.status !== 'confirmed' && (
                      <TouchableOpacity
                        style={styles.actionPillBtn}
                        onPress={() => onConfirmContribution?.(item)}
                        activeOpacity={0.8}
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
                        activeOpacity={0.8}
                      >
                        <SproutText style={[styles.actionPillBtnText, { color: '#183228' }]} weight="700">
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
        {members.length > 5 && (
          <TouchableOpacity
            style={styles.showMoreRow}
            onPress={() => setShowAllMembers((prev) => !prev)}
            activeOpacity={0.7}
          >
            <SproutText style={styles.showMoreText} weight="700">
              {showAllMembers ? 'Show fewer' : `Show all ${members.length} members`}
            </SproutText>
            {showAllMembers ? (
              <ChevronUp size={12} color={colors.accent} style={{ marginLeft: 3 }} />
            ) : (
              <ChevronDown size={12} color={colors.accent} style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Footer Card */}
      {summary && (
        <View style={styles.summaryFooter}>
          <SproutText style={styles.summaryTitle} weight="800">
            CLEARING TOTALS
          </SproutText>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Expected</SproutText>
              <SproutText style={styles.summaryValue} weight="800">
                {formatCurrencyExact(summary.grand_total)}
              </SproutText>
            </View>

            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Collected</SproutText>
              <SproutText style={[styles.summaryValue, { color: colors.accent }]} weight="800">
                {formatCurrencyExact(summary.total_paid)}
              </SproutText>
            </View>

            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Refunds</SproutText>
              <SproutText style={[styles.summaryValue, { color: colors.muted }]} weight="800">
                {formatCurrencyExact(summary.over_contributed)}
              </SproutText>
            </View>

            <View style={styles.summaryCol}>
              <SproutText style={styles.summaryLabel}>Pool Reserve</SproutText>
              <SproutText style={[styles.summaryValue, { color: colors.text }]} weight="800">
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
    backgroundColor: colors.surface, // Warm white card surface #FBFDF7
    borderRadius: radii.lg,
    padding: 12,
    marginHorizontal: 0,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    paddingBottom: 2,
  },
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  tableTitle: {
    fontSize: 14,
    letterSpacing: -0.3,
    color: colors.text,
  },
  memberCountBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  tableCount: {
    fontSize: 9.5,
    fontFamily: fontFamilies.bold,
    color: colors.muted,
  },
  listContainer: {
    marginVertical: 1,
  },
  memberCard: {
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.line, // Single crisp hairline matching ExpenseRow
  },
  lastCard: {
    borderBottomWidth: 0,
  },
  rowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  nameBlock: {
    marginLeft: 6,
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberName: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    color: colors.text,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
    marginLeft: 4,
    flexShrink: 0,
  },
  youBadgeText: {
    fontSize: 8,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
  },
  coordBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.sm,
    marginLeft: 3,
    flexShrink: 0,
  },
  coordBadgeText: {
    fontSize: 7.5,
    fontFamily: fontFamilies.bold,
    color: '#F6F7ED',
    letterSpacing: 0.5,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  balancePill: {
    backgroundColor: '#F4DACD', // Soft peach for to pay (BalancePillsRow)
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  balancePillText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#183228',
  },
  overpaidPill: {
    backgroundColor: '#D8E8CB', // Soft sage for to receive / overpaid (BalancePillsRow)
  },
  clearedPill: {
    backgroundColor: colors.background,
  },
  clearedPillText: {
    color: colors.muted,
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginTop: 2,
  },
  showMoreText: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
  },
  accordionBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: 8,
    marginTop: 4,
  },
  accordionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  accordionLabel: {
    fontSize: 10.5,
    fontFamily: fontFamilies.medium,
    color: colors.muted,
  },
  accordionValue: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },
  accordionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: 3,
  },
  accordionNetLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },
  accordionNetValue: {
    fontSize: 11,
    fontFamily: fontFamilies.extraBold,
  },
  accordionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 3,
  },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  statusChipText: {
    fontSize: 9.5,
    fontFamily: fontFamilies.bold,
  },
  actionPillBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radii.full,
  },
  actionPillBtnText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  refundBtn: {
    backgroundColor: colors.sun, // Warm gold button
  },
  summaryFooter: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: 8,
    marginTop: 6,
  },
  summaryTitle: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    fontFamily: fontFamilies.extraBold,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 3,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: fontFamilies.medium,
    color: colors.muted,
    marginBottom: 1,
  },
  summaryValue: {
    fontSize: 10.5,
    fontFamily: fontFamilies.extraBold,
    color: colors.text,
  },
});
