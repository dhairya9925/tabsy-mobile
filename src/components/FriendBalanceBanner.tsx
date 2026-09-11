import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
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
    ? '#FBFDF7'
    : isOwed
    ? '#D8E8CB'
    : '#F4DACD';

  const statusColor = isSettled
    ? '#536D5B'
    : isOwed
    ? '#407A58'
    : colors.negative;

  return (
    <View style={[styles.card, { backgroundColor: bannerBg }, isSettled && styles.cardSettled]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <SproutText style={styles.eyebrow}>
            1-ON-1 BALANCE
          </SproutText>
          <SproutText style={styles.amountText}>
            {formatCurrencyExact(Math.abs(netBalance))}
          </SproutText>
          <SproutText style={[styles.statusText, { color: statusColor }]}>
            {isSettled
              ? 'All settled up!'
              : isOwed
              ? `${friendName} owes you`
              : `You owe ${friendName}`}
          </SproutText>
        </View>

        <AvatarCircle name={friendName} size={46} />
      </View>

      {/* Settle Up CTA Button */}
      {!isSettled && onSettleUp && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSettleUp}
          style={styles.settleBtn}
        >
          <SproutText style={styles.settleBtnText}>
            Settle gently
          </SproutText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 19,
    marginVertical: spacing.md,
  },
  cardSettled: {
    borderWidth: 1,
    borderColor: '#CBD7CC',
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
  eyebrow: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#536D5B',
  },
  amountText: {
    fontFamily: fontFamilies.bold,
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: -1.8,
    color: '#183228',
    marginVertical: 4,
  },
  statusText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
  },
  settleBtn: {
    marginTop: spacing.md,
    backgroundColor: '#407A58',
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
