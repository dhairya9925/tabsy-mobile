import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
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
              color={colors.text}
              style={styles.heroAmount}
            >
              {formatCurrencyExact(Math.abs(netBalance))}
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
    borderRadius: 28,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerOwed: {
    backgroundColor: colors.soft,
  },
  bannerOwes: {
    backgroundColor: colors.clay,
  },
  bannerSettled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
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
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  subtitle: {
    marginTop: 2,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
    marginTop: spacing.md,
  },
});
