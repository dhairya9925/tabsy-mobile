import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrencyExact } from '../utils/formatters';
import { GroupBalance } from '../types';
import { ArrowRight, Handshake } from 'lucide-react-native';

export interface GroupBalanceRowProps {
  balance: GroupBalance;
  currentUserId?: string;
  onSettle?: (balance: GroupBalance) => void;
}

export const GroupBalanceRow: React.FC<GroupBalanceRowProps> = ({
  balance,
  currentUserId,
  onSettle,
}) => {
  const isYouOwe = balance.from_user_id === currentUserId;
  const isOwedToYou = balance.to_user_id === currentUserId;
  const canSettle = isYouOwe || isOwedToYou;

  const borderStyle = isYouOwe
    ? styles.borderOwe
    : isOwedToYou
    ? styles.borderOwed
    : styles.borderNormal;

  return (
    <View style={[styles.container, borderStyle]}>
      <View style={styles.topRow}>
        <View style={styles.partyCol}>
          <SproutText
            style={[
              styles.partyName,
              { color: isYouOwe ? colors.negative : colors.text },
            ]}
            numberOfLines={1}
          >
            {isYouOwe ? 'You' : balance.from_name}
          </SproutText>
          <SproutText style={styles.partyRole}>
            owes
          </SproutText>
        </View>

        <ArrowRight size={14} color={colors.muted} style={styles.arrow} />

        <View style={styles.partyCol}>
          <SproutText
            style={[
              styles.partyName,
              { color: isOwedToYou ? colors.accent : colors.text },
            ]}
            numberOfLines={1}
          >
            {isOwedToYou ? 'You' : balance.to_name}
          </SproutText>
          <SproutText style={styles.partyRole}>
            recipient
          </SproutText>
        </View>

        <View style={styles.amountCol}>
          <SproutText style={styles.amountText}>
            {formatCurrencyExact(balance.amount)}
          </SproutText>
        </View>
      </View>

      {canSettle && onSettle && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onSettle(balance)}
            style={styles.settleBtn}
          >
            <Handshake size={14} color={colors.accent} style={{ marginRight: 4 }} />
            <SproutText variant="caption" color={colors.accent} weight="700">
              Settle Up
            </SproutText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  borderOwe: {
    borderColor: '#E7C5B5',
    backgroundColor: '#FAF2EE',
  },
  borderOwed: {
    borderColor: '#C3D9B5',
    backgroundColor: '#F3F8F0',
  },
  borderNormal: {
    borderColor: colors.line,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyCol: {
    flex: 1,
  },
  partyName: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
  },
  partyRole: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  arrow: {
    marginHorizontal: spacing.sm,
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  amountText: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#00000008',
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
});
