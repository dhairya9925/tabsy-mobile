import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { formatCurrencyExact } from '../utils/formatters';

interface FriendBalanceBannerProps {
  friendName: string;
  netBalance: number; // positive = friend owes user, negative = user owes friend
  onSettleUp?: () => void;
}

export const FriendBalanceBanner: React.FC<FriendBalanceBannerProps> = ({
  friendName,
  netBalance,
  onSettleUp,
}) => {
  const isSettled = Math.abs(netBalance) < 0.01;
  const isOwed = netBalance > 0;

  const bannerBg = isSettled
    ? colors.surface
    : isOwed
    ? colors.soft
    : colors.clay;

  const statusColor = isSettled
    ? colors.muted
    : isOwed
    ? colors.accent
    : colors.negative;

  return (
    <View style={[styles.card, { backgroundColor: bannerBg }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <SproutText variant="eyebrow" color={colors.muted}>
            1-ON-1 BALANCE
          </SproutText>
          <SproutText variant="amount" color={colors.text} style={styles.amountText}>
            {formatCurrencyExact(Math.abs(netBalance))}
          </SproutText>
          <SproutText variant="caption" color={statusColor} weight="700">
            {isSettled
              ? 'All settled up!'
              : isOwed
              ? `${friendName} owes you`
              : `You owe ${friendName}`}
          </SproutText>
        </View>

        <AvatarCircle name={friendName} size={50} />
      </View>

      {/* Settle Up CTA Button */}
      {!isSettled && onSettleUp && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSettleUp}
          style={styles.settleBtn}
        >
          <SproutText variant="body" color={colors.onAccent} weight="700">
            Settle Up
          </SproutText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  amountText: {
    marginVertical: 4,
    fontSize: 34,
  },
  settleBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    minHeight: 48,
    paddingVertical: 0,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
