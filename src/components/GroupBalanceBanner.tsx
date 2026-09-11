import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontFamilies, spacing } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrency } from '../utils/formatters';
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
        <SproutText style={styles.eyebrow}>
          Clear between friends
        </SproutText>

        <View style={styles.amountRow}>
          {isSettled ? (
            <View style={styles.settledRow}>
              <CheckCircle2 size={24} color="#183228" style={{ marginRight: 8 }} />
              <SproutText style={styles.settledText}>
                All Settled
              </SproutText>
            </View>
          ) : (
            <SproutText style={styles.heroAmount}>
              {formatCurrency(Math.abs(netBalance))}
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
                  { marginLeft: idx === 0 ? 0 : -6, zIndex: 10 - idx },
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D8E8CB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 9,
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
    backgroundColor: '#D8E8CB',
  },
  topSection: {
    marginBottom: 0,
  },
  eyebrow: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#536D5B',
  },
  amountRow: {
    marginTop: 6,
    marginBottom: 2,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settledText: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1,
    color: '#183228',
  },
  heroAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: 35,
    lineHeight: 42,
    letterSpacing: -1.8,
    color: '#183228',
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#536D5B',
    marginTop: 2,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
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
    fontSize: 12,
    color: '#536D5B',
    marginLeft: 8,
  },
});
