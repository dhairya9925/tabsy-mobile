import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, useTheme, fontFamilies, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { formatCurrencyExact } from '../utils/formatters';
import { GroupBalance, GroupExpense } from '../types';
import {
  ArrowRight,
  Handshake,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Receipt,
  Info,
  HelpCircle,
  X,
} from 'lucide-react-native';

export interface WhoOwesWhomSectionProps {
  balances: GroupBalance[];
  expenses?: GroupExpense[];
  currentUserId?: string;
  onSettle?: (balance: GroupBalance) => void;
  onViewHistory?: () => void;
  isLoading?: boolean;
}

import { computeBalanceBreakdown, BalanceBreakdownResult } from '../utils/balanceBreakdown';
export { computeBalanceBreakdown };
export type { BalanceBreakdownResult };

interface ItemizedBreakdownCardProps {
  breakdown: BalanceBreakdownResult;
  onClose: () => void;
  style?: any;
}

const ItemizedBreakdownCard: React.FC<ItemizedBreakdownCardProps> = ({
  breakdown,
  onClose,
  style,
}) => {
  const { colors } = useTheme();
  const totalItemCount = breakdown.debts.length + breakdown.credits.length;

  return (
    <View style={[styles.itemizedCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.line }, style]}>
      {/* Header */}
      <View style={styles.itemizedHeader}>
        <View style={styles.itemizedHeaderLeft}>
          <Receipt size={13} color={colors.accent} style={{ marginRight: 5 }} />
          <SproutText variant="eyebrow" color={colors.accent} style={{ letterSpacing: 0.8, fontSize: 10 }}>
            ITEMIZED BREAKDOWN
          </SproutText>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close breakdown"
        >
          <X size={13} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {!breakdown.isSimplified ? (
        <View style={styles.itemizedContent}>
          {/* Scroll container if more than 5 expenses */}
          <ScrollView
            nestedScrollEnabled
            style={totalItemCount > 5 ? { maxHeight: 220 } : undefined}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Debts List: What Payer owes Recipient */}
            {breakdown.debts.length > 0 && (
              <View style={styles.itemizedSection}>
                <View style={[styles.itemizedSectionHeader, { borderBottomColor: colors.line }]}>
                  <SproutText variant="caption" color={colors.muted} weight="700" style={{ fontSize: 10.5 }}>
                    {breakdown.debtSectionTitle}
                  </SproutText>
                  <SproutText variant="caption" color={colors.text} weight="700" style={{ fontSize: 11 }}>
                    +{formatCurrencyExact(breakdown.totalDebt)}
                  </SproutText>
                </View>
                {breakdown.debts.map((item, idx) => (
                  <View key={`debt-${item.expenseId || idx}`} style={styles.itemizedRow}>
                    <View style={styles.itemizedRowLeft}>
                      <SproutText variant="caption" color={colors.text} weight="600" numberOfLines={1} style={{ fontSize: 11.5 }}>
                        {item.title}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted} style={{ fontSize: 10, marginTop: 1 }}>
                        {item.date ? `${item.date} • ` : ''}{item.shareLabel}
                      </SproutText>
                    </View>
                    <SproutText variant="caption" color={colors.negative || '#E57373'} weight="700" style={{ fontSize: 11.5 }}>
                      +{formatCurrencyExact(item.amount)}
                    </SproutText>
                  </View>
                ))}
              </View>
            )}

            {/* 2. Credits / Counter Offsets: What Recipient owes Payer */}
            {breakdown.credits.length > 0 && (
              <View style={[styles.itemizedSection, { marginTop: spacing.xs }]}>
                <View style={[styles.itemizedSectionHeader, { borderBottomColor: colors.line }]}>
                  <SproutText variant="caption" color={colors.muted} weight="700" style={{ fontSize: 10.5 }}>
                    {breakdown.creditSectionTitle}
                  </SproutText>
                  <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                    –{formatCurrencyExact(breakdown.totalCredit)}
                  </SproutText>
                </View>
                {breakdown.credits.map((item, idx) => (
                  <View key={`credit-${item.expenseId || idx}`} style={styles.itemizedRow}>
                    <View style={styles.itemizedRowLeft}>
                      <SproutText variant="caption" color={colors.text} weight="600" numberOfLines={1} style={{ fontSize: 11.5 }}>
                        {item.title}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted} style={{ fontSize: 10, marginTop: 1 }}>
                        {item.date ? `${item.date} • ` : ''}{item.shareLabel}
                      </SproutText>
                    </View>
                    <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11.5 }}>
                      –{formatCurrencyExact(item.amount)}
                    </SproutText>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Net Calculation Summary Footer */}
          <View style={[styles.itemizedFooter, { borderTopColor: colors.line }]}>
            <SproutText variant="caption" color={colors.muted} weight="700" style={{ fontSize: 11 }}>
              Net Amount to Settle
            </SproutText>
            <SproutText variant="body" color={colors.text} weight="800" style={{ fontSize: 13 }}>
              {formatCurrencyExact(breakdown.netAmount)}
            </SproutText>
          </View>
        </View>
      ) : (
        /* Multi-Party Debt Simplification Fallback */
        <View style={styles.itemizedSimplified}>
          <View style={styles.simplifiedHeaderRow}>
            <Sparkles size={13} color={colors.accent} style={{ marginRight: 5 }} />
            <SproutText variant="caption" color={colors.text} weight="700" style={{ fontSize: 11.5 }}>
              Group Debt Simplification
            </SproutText>
          </View>
          <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, lineHeight: 16, marginTop: 3 }}>
            This payment resolves net group dues across multiple shared expenses to minimize individual transfers.
          </SproutText>
          {breakdown.involvedExpenses.length > 0 && (
            <View style={styles.chipsRow}>
              {breakdown.involvedExpenses.map((expTitle, idx) => (
                <View key={`chip-${idx}`} style={[styles.chipPill, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <SproutText variant="caption" color={colors.text} style={{ fontSize: 10 }}>
                    {expTitle}
                  </SproutText>
                </View>
              ))}
            </View>
          )}
          <View style={[styles.itemizedFooter, { borderTopColor: colors.line, marginTop: spacing.xs }]}>
            <SproutText variant="caption" color={colors.muted} weight="700" style={{ fontSize: 11 }}>
              Net Simplified Amount
            </SproutText>
            <SproutText variant="body" color={colors.text} weight="800" style={{ fontSize: 13 }}>
              {formatCurrencyExact(breakdown.netAmount)}
            </SproutText>
          </View>
        </View>
      )}
    </View>
  );
};

const DEFAULT_VISIBLE_COUNT = 4;

export const WhoOwesWhomSection: React.FC<WhoOwesWhomSectionProps> = ({
  balances,
  expenses = [],
  currentUserId,
  onSettle,
  onViewHistory,
  isLoading = false,
}) => {
  const { colors, isDark } = useTheme();
  const [showAllTransfers, setShowAllTransfers] = useState(false);
  const [expandedBreakdownKey, setExpandedBreakdownKey] = useState<string | null>(null);

  const toggleBreakdown = (key: string) => {
    setExpandedBreakdownKey((prev) => (prev === key ? null : key));
  };

  // Group balances into: user-involved vs other member transfers
  const myDebts: GroupBalance[] = [];
  const myCredits: GroupBalance[] = [];
  const otherTransfers: GroupBalance[] = [];

  balances.forEach((b) => {
    if (b.from_user_id === currentUserId) {
      myDebts.push(b);
    } else if (b.to_user_id === currentUserId) {
      myCredits.push(b);
    } else {
      otherTransfers.push(b);
    }
  });

  const hasMyBalances = myDebts.length > 0 || myCredits.length > 0;
  const visibleTransfers = showAllTransfers
    ? otherTransfers
    : otherTransfers.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCount = otherTransfers.length - DEFAULT_VISIBLE_COUNT;

  if (balances.length === 0 && !isLoading) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <CheckCircle2 size={40} color={colors.accent} strokeWidth={1.5} />
        <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
          All settled up!
        </SproutText>
        <SproutText variant="caption" color={colors.muted} style={{ marginBottom: onViewHistory ? spacing.md : 0 }}>
          No outstanding balances in this group.
        </SproutText>
        {onViewHistory && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.emptyHistoryBtn, { backgroundColor: colors.accentSoft }]}
            onPress={onViewHistory}
          >
            <Receipt size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <SproutText variant="caption" color={colors.accent} weight="700">
              View Settlement History
            </SproutText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* 1. PRIORITY SECTION: User's Actionable Settlements (You Owe / Owed to You) */}
      {hasMyBalances && (
        <View style={[styles.myBalancesCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.myBalancesHeader, { borderBottomColor: colors.line }]}>
            <View style={styles.myHeaderLeft}>
              <View style={[styles.pulseDot, { backgroundColor: colors.accent }]} />
              <SproutText variant="eyebrow" color={colors.text} style={styles.myHeaderEyebrow}>
                YOUR PENDING SETTLEMENTS
              </SproutText>
            </View>
            <View style={[styles.myBadge, { backgroundColor: colors.accentSoft }]}>
              <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 10.5 }}>
                {myDebts.length + myCredits.length} to settle
              </SproutText>
            </View>
          </View>

          {/* Dues you need to pay */}
          {myDebts.map((b, idx) => {
            const key = `my-debt-${b.to_user_id}-${idx}`;
            const isExpanded = expandedBreakdownKey === key;
            const breakdown = isExpanded ? computeBalanceBreakdown(b, expenses, currentUserId) : null;

            return (
              <View
                key={key}
                style={[
                  styles.actionRowContainer,
                  idx > 0 && [styles.rowBorderTop, { borderTopColor: colors.line }],
                ]}
              >
                <View style={styles.actionRow}>
                  {/* Tappable Tile Area (Avatar, Name, Tag & Subtext with Dropdown Chevron) */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.tilePressableArea}
                    onPress={() => toggleBreakdown(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle balance breakdown for ${b.to_name}`}
                  >
                    <AvatarCircle name={b.to_name} size={36} />
                    <View style={styles.actionDetails}>
                      <View style={styles.nameRow}>
                        <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1}>
                          Pay {b.to_name}
                        </SproutText>
                        <View style={[styles.debtTag, { backgroundColor: colors.negativeSoft, borderColor: colors.negative }]}>
                          <SproutText style={[styles.debtTagText, { color: colors.negative }]}>YOU OWE</SproutText>
                        </View>
                      </View>
                      <View style={styles.subtextRow}>
                        <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }} numberOfLines={1}>
                          Direct payment to settle
                        </SproutText>
                        <View style={styles.dropdownIndicator}>
                          {isExpanded ? (
                            <ChevronUp size={13} color={colors.accent} strokeWidth={2.2} />
                          ) : (
                            <ChevronDown size={13} color={colors.muted} strokeWidth={2.2} />
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.actionRight}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleBreakdown(key)}
                    >
                      <SproutText variant="body" color={colors.text} weight="700" style={styles.amountText}>
                        {formatCurrencyExact(b.amount)}
                      </SproutText>
                    </TouchableOpacity>
                    {onSettle && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.settleBtn, { backgroundColor: colors.accent }]}
                        onPress={() => onSettle(b)}
                      >
                        <Handshake size={12} color={colors.onAccent || colors.surface} style={{ marginRight: 4 }} />
                        <SproutText style={[styles.settleBtnText, { color: colors.onAccent || colors.surface }]}>
                          Settle Up
                        </SproutText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Inline Itemized Breakdown Dropdown Card */}
                {isExpanded && breakdown && (
                  <ItemizedBreakdownCard
                    breakdown={breakdown}
                    onClose={() => setExpandedBreakdownKey(null)}
                  />
                )}
              </View>
            );
          })}

          {/* Dues other people owe you */}
          {myCredits.map((b, idx) => {
            const key = `my-credit-${b.from_user_id}-${idx}`;
            const isExpanded = expandedBreakdownKey === key;
            const breakdown = isExpanded ? computeBalanceBreakdown(b, expenses, currentUserId) : null;

            return (
              <View
                key={key}
                style={[
                  styles.actionRowContainer,
                  (myDebts.length > 0 || idx > 0) && [styles.rowBorderTop, { borderTopColor: colors.line }],
                ]}
              >
                <View style={styles.actionRow}>
                  {/* Tappable Tile Area (Avatar, Name, Tag & Subtext with Dropdown Chevron) */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.tilePressableArea}
                    onPress={() => toggleBreakdown(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle balance breakdown for ${b.from_name}`}
                  >
                    <AvatarCircle name={b.from_name} size={36} />
                    <View style={styles.actionDetails}>
                      <View style={styles.nameRow}>
                        <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1}>
                          {b.from_name}
                        </SproutText>
                        <View style={[styles.creditTag, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                          <SproutText style={[styles.creditTagText, { color: colors.accent }]}>OWES YOU</SproutText>
                        </View>
                      </View>
                      <View style={styles.subtextRow}>
                        <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }} numberOfLines={1}>
                          Awaiting settlement
                        </SproutText>
                        <View style={styles.dropdownIndicator}>
                          {isExpanded ? (
                            <ChevronUp size={13} color={colors.accent} strokeWidth={2.2} />
                          ) : (
                            <ChevronDown size={13} color={colors.muted} strokeWidth={2.2} />
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.actionRight}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleBreakdown(key)}
                    >
                      <SproutText variant="body" color={colors.accent} weight="700" style={styles.amountText}>
                        +{formatCurrencyExact(b.amount)}
                      </SproutText>
                    </TouchableOpacity>
                    {onSettle && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.settleCreditBtn,
                          {
                            backgroundColor: colors.accentSoft,
                            borderWidth: 1,
                            borderColor: isDark ? colors.line : 'transparent',
                          },
                        ]}
                        onPress={() => onSettle(b)}
                      >
                        <Handshake size={12} color={colors.accent} style={{ marginRight: 4 }} />
                        <SproutText style={[styles.settleCreditText, { color: colors.accent }]}>
                          Record
                        </SproutText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Inline Itemized Breakdown Dropdown Card */}
                {isExpanded && breakdown && (
                  <ItemizedBreakdownCard
                    breakdown={breakdown}
                    onClose={() => setExpandedBreakdownKey(null)}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* 2. SQUARED AWAY PILL (When current user has 0 dues, but others still owe) */}
      {!hasMyBalances && otherTransfers.length > 0 && (
        <View style={[styles.squaredAwayPill, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
          <Sparkles size={14} color={colors.accent} />
          <SproutText variant="caption" color={colors.accent} weight="600" style={{ fontSize: 11.5 }}>
            You're all squared away · No pending payments for you
          </SproutText>
        </View>
      )}

      {/* 3. COHESIVE GROUP TRANSFERS TABLE (All other roommates) */}
      {otherTransfers.length > 0 && (
        <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.line }]}>
            <View>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.tableEyebrow}>
                {hasMyBalances ? 'OTHER GROUP BALANCES' : 'SIMPLIFIED DEBT TRANSFERS'}
              </SproutText>
              <SproutText variant="subtitle" color={colors.text} weight="700" style={{ fontSize: 14 }}>
                Who Owes Whom
              </SproutText>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.soft }]}>
              <SproutText variant="caption" color={colors.muted} weight="600" style={{ fontSize: 10.5 }}>
                {otherTransfers.length} transfer{otherTransfers.length > 1 ? 's' : ''}
              </SproutText>
            </View>
          </View>

          {/* Transfer Rows */}
          <View style={styles.rowsContainer}>
            {visibleTransfers.map((b, idx) => {
              const key = `other-${b.from_user_id}-${b.to_user_id}-${idx}`;
              const isExpanded = expandedBreakdownKey === key;
              const breakdown = isExpanded ? computeBalanceBreakdown(b, expenses, currentUserId) : null;

              return (
                <View
                  key={key}
                  style={[
                    styles.tableRowContainer,
                    idx > 0 && [styles.rowHairlineBorder, { borderTopColor: colors.line }],
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.tableRow}
                    onPress={() => toggleBreakdown(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle breakdown between ${b.from_name} and ${b.to_name}`}
                  >
                    {/* Debtor */}
                    <View style={styles.personCol}>
                      <AvatarCircle name={b.from_name} size={24} />
                      <SproutText
                        variant="body"
                        color={colors.text}
                        weight="600"
                        numberOfLines={1}
                        style={styles.personName}
                      >
                        {b.from_name}
                      </SproutText>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowWrap}>
                      <ArrowRight size={12} color={colors.muted} />
                    </View>

                    {/* Recipient */}
                    <View style={styles.personCol}>
                      <AvatarCircle name={b.to_name} size={24} />
                      <SproutText
                        variant="body"
                        color={colors.text}
                        weight="600"
                        numberOfLines={1}
                        style={styles.personName}
                      >
                        {b.to_name}
                      </SproutText>
                    </View>

                    {/* Amount + Dropdown Chevron */}
                    <View style={styles.rowAmountCol}>
                      <SproutText variant="body" color={colors.text} weight="700" style={styles.rowAmount}>
                        {formatCurrencyExact(b.amount)}
                      </SproutText>
                      <View style={{ marginLeft: 3 }}>
                        {isExpanded ? (
                          <ChevronUp size={12} color={colors.accent} strokeWidth={2.2} />
                        ) : (
                          <ChevronDown size={12} color={colors.muted} strokeWidth={2.2} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Inline Itemized Breakdown Dropdown Card */}
                  {isExpanded && breakdown && (
                    <ItemizedBreakdownCard
                      breakdown={breakdown}
                      onClose={() => setExpandedBreakdownKey(null)}
                      style={{ marginHorizontal: 2, marginBottom: spacing.sm }}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Show More / Fewer Toggle */}
          {hiddenCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAllTransfers(!showAllTransfers)}
              style={[styles.toggleBtn, { borderTopColor: colors.line }]}
            >
              <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                {showAllTransfers
                  ? 'Show fewer transfers'
                  : `Show all ${otherTransfers.length} transfers`}
              </SproutText>
              {showAllTransfers ? (
                <ChevronUp size={13} color={colors.accent} style={{ marginLeft: 3 }} />
              ) : (
                <ChevronDown size={13} color={colors.accent} style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. SETTLEMENT HISTORY LINK AT BOTTOM OF BALANCES */}
      {onViewHistory && (
        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.historyLinkRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.line }]}
          onPress={onViewHistory}
        >
          <Receipt size={16} color={colors.accent} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <SproutText variant="body" color={colors.text} weight="700" style={{ fontSize: 13 }}>
              Settlement History
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
              Review all settlement records, notes & 3-day edit audit trail
            </SproutText>
          </View>
          <ArrowRight size={15} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  /* 1. Priority My Balances Card */
  myBalancesCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.negative,
    padding: 13,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  myBalancesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  myHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  myHeaderEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.1,
    fontFamily: fontFamilies.extraBold,
  },
  myBadge: {
    backgroundColor: colors.soft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  actionRowContainer: {
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  rowBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  actionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  debtTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  debtTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  creditTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  creditTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tilePressableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dropdownIndicator: {
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 14,
    letterSpacing: -0.3,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.full,
  },
  settleBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  settleCreditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.soft,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.full,
  },
  settleCreditText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.text,
  },

  /* Itemized Breakdown Card Styles */
  itemizedCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  itemizedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemizedContent: {
    marginTop: 4,
    gap: spacing.xs,
  },
  itemizedSection: {
    gap: 4,
  },
  itemizedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    marginBottom: 4,
  },
  itemizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemizedRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  itemizedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
  },
  itemizedSimplified: {
    marginTop: 4,
  },
  simplifiedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chipPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },

  /* 2. Squared Away Pill */
  squaredAwayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },

  /* 3. Table Card */
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tableEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.1,
    fontFamily: fontFamilies.extraBold,
    marginBottom: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  rowsContainer: {
    paddingTop: 2,
  },
  tableRowContainer: {
    paddingVertical: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowHairlineBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  personCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  personName: {
    fontSize: 12,
    flex: 1,
  },
  arrowWrap: {
    paddingHorizontal: 6,
  },
  rowAmountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 6,
  },
  rowAmount: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 9,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  emptyHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    marginTop: spacing.xs,
  },
  historyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
});
