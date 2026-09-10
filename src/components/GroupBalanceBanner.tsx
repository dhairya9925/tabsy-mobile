import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { SproutButton } from './SproutButton';
import { formatCurrencyExact } from '../utils/formatters';
import { GroupMember } from '../types';
import { CheckCircle2 } from 'lucide-react-native';

export interface GroupBalanceBannerProps {
  netBalance: number; // >0 user is owed, <0 user owes, 0 settled
  members: GroupMember[];
  onSettlePress?: () => void;
}

export const GroupBalanceBanner: React.FC<GroupBalanceBannerProps> = ({
  netBalance,
  members,
  onSettlePress,
}) => {
  const isSettled = Math.abs(netBalance) <= 0.01;
  const isOwed = netBalance > 0.01;

  const bgStyle = isSettled
    ? styles.bannerSettled
    : isOwed
    ? styles.bannerOwed
    : styles.bannerOwes;

  const amountColor = isSettled
    ? colors.text
    : isOwed
    ? colors.accent
    : colors.negative;

  const otherMembersCount = Math.max(0, members.length - 1);

  return (
    <View style={[styles.container, bgStyle]}>
      <View style={styles.topSection}>
        <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
          CLEAR BETWEEN FRIENDS
        </SproutText>

        <View style={styles.amountRow}>
          {isSettled ? (
            <View style={styles.settledRow}>
              <CheckCircle2 size={24} color={colors.accent} style={{ marginRight: 6 }} />
              <SproutText variant="hero" color={colors.text} style={styles.heroAmount}>
                All Settled
              </SproutText>
            </View>
          ) : (
            <SproutText
              variant="amount"
              color={amountColor}
              style={styles.heroAmount}
            >
              {isOwed ? '+' : '-'}{formatCurrencyExact(Math.abs(netBalance))}
            </SproutText>
          )}
        </View>

        <SproutText variant="caption" color={colors.muted} style={styles.subtitle}>
          {isSettled
            ? 'No pending balances in this group.'
            : isOwed
            ? 'coming back to you'
            : 'you owe in this group'}
        </SproutText>
      </View>

      {/* Member summary footer */}
      <View style={styles.membersRow}>
        <View style={styles.avatarsCluster}>
          {members.slice(0, 4).map((m, idx) => {
            const initial = (m.profile?.display_name || m.profile?.email || '?').charAt(0).toUpperCase();
            return (
              <View
                key={m.id || idx}
                style={[
                  styles.miniAvatar,
                  { marginLeft: idx === 0 ? 0 : -10, zIndex: 10 - idx },
                ]}
              >
                <SproutText variant="caption" color={colors.text} weight="800" style={styles.miniInitial}>
                  {initial}
                </SproutText>
              </View>
            );
          })}
        </View>
        <SproutText variant="caption" color={colors.text} weight="700" style={styles.membersText}>
          {members.length > 0 ? `You + ${otherMembersCount} friend${otherMembersCount !== 1 ? 's' : ''}` : 'Group members'}
        </SproutText>
      </View>

      {/* Settle Up Action */}
      {!isSettled && onSettlePress && (
        <SproutButton
          label="Settle Up"
          onPress={onSettlePress}
          style={styles.settleBtn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  bannerOwed: {
    backgroundColor: colors.soft, // Tender leaf green #D8E8CB
    borderColor: '#C3D9B5',
  },
  bannerOwes: {
    backgroundColor: colors.clay, // Soft peach #F4DACD
    borderColor: '#E7C5B5',
  },
  bannerSettled: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  topSection: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  amountRow: {
    marginVertical: 4,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAmount: {
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: 2,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
    marginBottom: spacing.xs,
  },
  avatarsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  miniInitial: {
    fontSize: 11,
  },
  membersText: {
    fontSize: 12,
  },
  settleBtn: {
    marginTop: spacing.sm,
  },
});
