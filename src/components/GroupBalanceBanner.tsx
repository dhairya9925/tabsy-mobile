import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { fontFamilies, spacing } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrency } from '../utils/formatters';
import { GroupMember } from '../types';
import { getGroupTypeMeta } from '../utils/groupTypes';
import { CheckCheck, Share2 } from 'lucide-react-native';

export interface GroupBalanceBannerProps {
  netBalance: number; // >0 user is owed, <0 user owes, 0 settled
  members: GroupMember[];
  onSettlePress?: () => void;
  onSharePress?: () => void;
  groupName?: string;
  groupDescription?: string | null;
  groupType?: string | null;
}

export const GroupBalanceBanner: React.FC<GroupBalanceBannerProps> = ({
  netBalance,
  members,
  onSettlePress,
  onSharePress,
  groupName = 'Group',
  groupDescription,
  groupType,
}) => {
  const [isSettledExpanded, setIsSettledExpanded] = useState(false);
  const animProgress = useRef(new Animated.Value(0)).current; // 0 = circle, 1 = expanded pill
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const toggleSettledExpanded = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    const nextState = !isSettledExpanded;
    setIsSettledExpanded(nextState);

    Animated.timing(animProgress, {
      toValue: nextState ? 1 : 0,
      duration: 240,
      easing: nextState ? Easing.out(Easing.cubic) : Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    if (nextState) {
      collapseTimerRef.current = setTimeout(() => {
        setIsSettledExpanded(false);
        Animated.timing(animProgress, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }).start();
      }, 3500);
    }
  };

  const badgeWidth = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 98],
  });

  const textOpacity = animProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });

  const textTranslateX = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  const typeMeta = getGroupTypeMeta(groupType);
  const isSettled = Math.abs(netBalance) <= 0.01;
  const isOwed = netBalance > 0.01;

  const bgStyle = isSettled
    ? styles.bannerSettled
    : isOwed
    ? styles.bannerOwed
    : styles.bannerOwes;

  const otherMembersCount = Math.max(0, members.length - 1);

  const descriptionText =
    groupDescription && groupDescription.trim().length > 0
      ? groupDescription.trim()
      : `${typeMeta.label} · ${members.length} ${members.length === 1 ? 'member' : 'members'}`;

  return (
    <View style={[styles.container, bgStyle]}>
      {/* Top Row: Eyebrow on left & Action buttons (Share + Settled/Balance Badge) in corner */}
      <View style={styles.topRow}>
        <SproutText style={styles.eyebrow}>
          Clear between friends
        </SproutText>

        <View style={styles.topRightActions}>
          {onSharePress && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onSharePress}
              style={styles.cardShareBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Share group invite"
            >
              <Share2 size={13} color="#183228" strokeWidth={2.2} />
            </TouchableOpacity>
          )}

          {isSettled ? (
            <Animated.View
              style={[
                styles.settledBadgeContainer,
                { width: badgeWidth },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleSettledExpanded}
                style={styles.settledBadgeInner}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={isSettledExpanded ? 'All settled up' : 'All settled - tap to view status'}
              >
                <View style={styles.settledIconBox}>
                  <CheckCheck
                    size={14}
                    color="#D8E8CB"
                    strokeWidth={2.2}
                  />
                </View>
                <Animated.View
                  style={[
                    styles.settledTextWrapper,
                    {
                      opacity: textOpacity,
                      transform: [{ translateX: textTranslateX }],
                    },
                  ]}
                >
                  <SproutText style={styles.cornerBadgeTextSettled} numberOfLines={1}>
                    All Settled
                  </SproutText>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View
              style={[
                styles.cornerBadge,
                isOwed ? styles.cornerBadgeOwed : styles.cornerBadgeOwes,
              ]}
            >
              {isOwed ? (
                <SproutText style={styles.cornerBadgeTextOwed}>
                  +{formatCurrency(netBalance)}
                </SproutText>
              ) : (
                <SproutText style={styles.cornerBadgeTextOwes}>
                  -{formatCurrency(Math.abs(netBalance))}
                </SproutText>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Main Heading: Group Name in place of All Settled */}
      <View style={styles.titleRow}>
        <SproutText style={styles.groupName} numberOfLines={1}>
          {groupName}
        </SproutText>
      </View>

      {/* Subtitle: Group Description in place of "No pending balances in this group." */}
      <SproutText style={styles.description} numberOfLines={2}>
        {descriptionText}
      </SproutText>

      {/* Member summary footer */}
      <View style={styles.membersRow}>
        <View style={styles.membersLeft}>
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

        {!isSettled && onSettlePress && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSettlePress}
            style={styles.settleBtn}
          >
            <SproutText style={styles.settleBtnText}>
              Settle Up
            </SproutText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D8E8CB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 18,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardShareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eyebrow: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#536D5B',
  },
  settledBadgeContainer: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#183228',
    overflow: 'hidden',
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  settledBadgeInner: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    paddingRight: 10,
  },
  settledIconBox: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  settledTextWrapper: {
    justifyContent: 'center',
  },
  cornerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cornerBadgeOwed: {
    backgroundColor: '#FFFFFF',
  },
  cornerBadgeOwes: {
    backgroundColor: '#FFFFFF',
  },
  cornerBadgeTextSettled: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#D8E8CB',
  },
  cornerBadgeTextOwed: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#235634',
  },
  cornerBadgeTextOwes: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#AF4932',
  },
  titleRow: {
    marginTop: 2,
    marginBottom: 3,
  },
  groupName: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: '#183228',
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#536D5B',
    marginBottom: 14,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  settleBtn: {
    backgroundColor: '#355E47',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  settleBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});

