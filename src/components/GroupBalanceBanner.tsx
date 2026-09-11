import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
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
        <SproutText variant="eyebrow" color="#536D5B" style={styles.eyebrow}>
          CLEAR BETWEEN FRIENDS
        </SproutText>

        <View style={styles.amountRow}>
          {isSettled ? (
            <View style={styles.settledRow}>
              <CheckCircle2 size={20} color={colors.accent} style={{ marginRight: 6 }} />
              <SproutText style={styles.settledText}>
                All Settled
              </SproutText>
            </View>
          ) : (
            <SproutText style={styles.heroAmount}>
              {formatCurrencyExact(Math.abs(netBalance))}
            </SproutText>
          )}
        </View>

        <SproutText style={styles.subtitle}>
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
                  { marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx },
                ]}
              >
                <SproutText style={styles.miniInitial}>
                  {initial}
                </SproutText>
              </View>
            );
          })}
        </View>
        <SproutText style={styles.membersText}>
          {members.length > 0 ? `You + ${otherMembersCount} friend${otherMembersCount !== 1 ? 's' : ''}` : 'Group members'}
        </SproutText>
      </View>

      {/* Settle Up Action */}
      {!isSettled && onSettlePress && (
        <SproutButton
          label="Settle gently"
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
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 19,
    marginBottom: spacing.md,
  },
  bannerOwed: {
    backgroundColor: '#D8E8CB',
  },
  bannerOwes: {
    backgroundColor: '#F4DACD',
  },
  bannerSettled: {
    backgroundColor: '#FBFDF7',
    borderWidth: 1,
    borderColor: '#CBD7CC',
  },
  topSection: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#536D5B',
  },
  amountRow: {
    marginVertical: 4,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settledText: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    letterSpacing: -0.6,
    color: '#183228',
  },
  heroAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: -1.8,
    color: '#183228',
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#536D5B',
    marginTop: 2,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#18322810',
    marginBottom: 4,
  },
  avatarsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FBFDF7',
    borderWidth: 1.5,
    borderColor: '#D8E8CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInitial: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#407A58',
  },
  membersText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#536D5B',
    marginLeft: 8,
  },
  settleBtn: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#407A58',
  },
});
