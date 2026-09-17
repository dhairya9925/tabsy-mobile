import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { formatCurrencyExact } from '../utils/formatters';
import { GroupBalance } from '../types';
import {
  ArrowRight,
  Handshake,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';

export interface WhoOwesWhomSectionProps {
  balances: GroupBalance[];
  currentUserId?: string;
  onSettle?: (balance: GroupBalance) => void;
  isLoading?: boolean;
}

const DEFAULT_VISIBLE_COUNT = 4;

export const WhoOwesWhomSection: React.FC<WhoOwesWhomSectionProps> = ({
  balances,
  currentUserId,
  onSettle,
  isLoading = false,
}) => {
  const [showAllTransfers, setShowAllTransfers] = useState(false);

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
      <View style={styles.emptyCard}>
        <CheckCircle2 size={40} color={colors.accent} strokeWidth={1.5} />
        <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
          All settled up!
        </SproutText>
        <SproutText variant="caption" color={colors.muted}>
          No outstanding balances in this group.
        </SproutText>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* 1. PRIORITY SECTION: User's Actionable Settlements (You Owe / Owed to You) */}
      {hasMyBalances && (
        <View style={styles.myBalancesCard}>
          <View style={styles.myBalancesHeader}>
            <View style={styles.myHeaderLeft}>
              <View style={styles.pulseDot} />
              <SproutText variant="eyebrow" color={colors.text} style={styles.myHeaderEyebrow}>
                YOUR PENDING SETTLEMENTS
              </SproutText>
            </View>
            <View style={styles.myBadge}>
              <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 10.5 }}>
                {myDebts.length + myCredits.length} to settle
              </SproutText>
            </View>
          </View>

          {/* Dues you need to pay */}
          {myDebts.map((b, idx) => (
            <View
              key={`my-debt-${b.to_user_id}-${idx}`}
              style={[
                styles.actionRow,
                idx > 0 && styles.rowBorderTop,
              ]}
            >
              <AvatarCircle name={b.to_name} size={36} />
              <View style={styles.actionDetails}>
                <View style={styles.nameRow}>
                  <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1}>
                    Pay {b.to_name}
                  </SproutText>
                  <View style={styles.debtTag}>
                    <SproutText style={styles.debtTagText}>YOU OWE</SproutText>
                  </View>
                </View>
                <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
                  Direct payment to settle your share
                </SproutText>
              </View>

              <View style={styles.actionRight}>
                <SproutText variant="body" color={colors.text} weight="700" style={styles.amountText}>
                  {formatCurrencyExact(b.amount)}
                </SproutText>
                {onSettle && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.settleBtn}
                    onPress={() => onSettle(b)}
                  >
                    <Handshake size={12} color="#F0BF67" style={{ marginRight: 4 }} />
                    <SproutText style={styles.settleBtnText}>
                      Settle Up
                    </SproutText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Dues other people owe you */}
          {myCredits.map((b, idx) => (
            <View
              key={`my-credit-${b.from_user_id}-${idx}`}
              style={[
                styles.actionRow,
                (myDebts.length > 0 || idx > 0) && styles.rowBorderTop,
              ]}
            >
              <AvatarCircle name={b.from_name} size={36} />
              <View style={styles.actionDetails}>
                <View style={styles.nameRow}>
                  <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1}>
                    {b.from_name}
                  </SproutText>
                  <View style={styles.creditTag}>
                    <SproutText style={styles.creditTagText}>OWES YOU</SproutText>
                  </View>
                </View>
                <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
                  Awaiting settlement from member
                </SproutText>
              </View>

              <View style={styles.actionRight}>
                <SproutText variant="body" color={colors.accent} weight="700" style={styles.amountText}>
                  +{formatCurrencyExact(b.amount)}
                </SproutText>
                {onSettle && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.settleCreditBtn}
                    onPress={() => onSettle(b)}
                  >
                    <Handshake size={12} color={colors.text} style={{ marginRight: 4 }} />
                    <SproutText style={styles.settleCreditText}>
                      Record
                    </SproutText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 2. SQUARED AWAY PILL (When current user has 0 dues, but others still owe) */}
      {!hasMyBalances && otherTransfers.length > 0 && (
        <View style={styles.squaredAwayPill}>
          <Sparkles size={14} color={colors.accent} />
          <SproutText variant="caption" color={colors.accent} weight="600" style={{ fontSize: 11.5 }}>
            You're all squared away · No pending payments for you
          </SproutText>
        </View>
      )}

      {/* 3. COHESIVE GROUP TRANSFERS TABLE (All other roommates) */}
      {otherTransfers.length > 0 && (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <View>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.tableEyebrow}>
                {hasMyBalances ? 'OTHER GROUP BALANCES' : 'SIMPLIFIED DEBT TRANSFERS'}
              </SproutText>
              <SproutText variant="subtitle" color={colors.text} weight="700" style={{ fontSize: 14 }}>
                Who Owes Whom
              </SproutText>
            </View>
            <View style={styles.countBadge}>
              <SproutText variant="caption" color={colors.muted} weight="600" style={{ fontSize: 10.5 }}>
                {otherTransfers.length} transfer{otherTransfers.length > 1 ? 's' : ''}
              </SproutText>
            </View>
          </View>

          {/* Transfer Rows */}
          <View style={styles.rowsContainer}>
            {visibleTransfers.map((b, idx) => (
              <View
                key={`other-${b.from_user_id}-${b.to_user_id}-${idx}`}
                style={[
                  styles.tableRow,
                  idx > 0 && styles.rowHairlineBorder,
                ]}
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

                {/* Amount */}
                <View style={styles.rowAmountCol}>
                  <SproutText variant="body" color={colors.text} weight="700" style={styles.rowAmount}>
                    {formatCurrencyExact(b.amount)}
                  </SproutText>
                </View>
              </View>
            ))}
          </View>

          {/* Show More / Fewer Toggle */}
          {hiddenCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAllTransfers(!showAllTransfers)}
              style={styles.toggleBtn}
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
    borderColor: '#E7C5B5',
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  rowBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  actionDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  debtTag: {
    backgroundColor: '#FAF2EE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E7C5B5',
  },
  debtTagText: {
    fontSize: 7.5,
    fontFamily: fontFamilies.bold,
    color: '#9C4221',
    letterSpacing: 0.5,
  },
  creditTag: {
    backgroundColor: '#EBF5E5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#C3D9B5',
  },
  creditTagText: {
    fontSize: 7.5,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  actionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 14.5,
    letterSpacing: -0.3,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radii.full,
  },
  settleBtnText: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: '#F0BF67',
  },
  settleCreditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.soft,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  settleCreditText: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },

  /* 2. Squared Away Pill */
  squaredAwayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF5E5',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E8CB',
  },

  /* 3. Table Card (All other transfers) */
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tableEyebrow: {
    fontSize: 8,
    letterSpacing: 1.1,
    marginBottom: 1,
  },
  countBadge: {
    backgroundColor: colors.soft,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radii.full,
  },
  rowsContainer: {
    gap: 0,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  rowHairlineBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  personCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  arrowWrap: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAmountCol: {
    alignItems: 'flex-end',
    marginLeft: 6,
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
});
