import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { fontFamilies, spacing } from '../theme';
import { SproutText } from './SproutText';
import { Group } from '../types';
import { getGroupTypeMeta } from '../utils/groupTypes';
import { formatCurrency } from '../utils/formatters';
import { Home, Plane, Coffee, PartyPopper, Receipt, ChevronRight } from 'lucide-react-native';

export interface GroupCardProps {
  group: Group;
  memberCount?: number;
  netBalance?: number; // >0 you're owed, <0 you owe, 0 settled
  onPress?: () => void;
}

export function getGroupIcon(type?: string | null, size = 20, color = '#335C44') {
  switch (type) {
    case 'shared_living':
      return <Home size={size} color={color} strokeWidth={2} />;
    case 'trip':
      return <Plane size={size} color={color} strokeWidth={2} />;
    case 'event':
      return <PartyPopper size={size} color={color} strokeWidth={2} />;
    case 'reimbursable':
      return <Receipt size={size} color={color} strokeWidth={2} />;
    case 'day_to_day':
    default:
      return <Coffee size={size} color={color} strokeWidth={2} />;
  }
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  memberCount = 1,
  netBalance = 0,
  onPress,
}) => {
  const typeMeta = getGroupTypeMeta(group.type);
  const isSettled = Math.abs(netBalance) <= 0.01;
  const isOwed = netBalance > 0.01;

  const memberLabel = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
  const subtitle = `${typeMeta.label} · ${memberLabel}`;

  const description =
    group.description && group.description.trim().length > 0
      ? group.description
      : isSettled
      ? 'All members settled'
      : isOwed
      ? 'Share pending collection'
      : 'Share pending payment';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.iconSquircle}>
          {getGroupIcon(group.type, 18, '#335C44')}
        </View>

        <View style={styles.infoCol}>
          <SproutText style={styles.title} numberOfLines={1}>
            {group.name}
          </SproutText>
          <SproutText style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </SproutText>
        </View>

        <ChevronRight size={17} color="#8D9E92" strokeWidth={2} style={styles.chevron} />
      </View>

      {/* Hairline Divider */}
      <View style={styles.divider} />

      {/* Bottom Footer Row */}
      <View style={styles.bottomRow}>
        <SproutText style={styles.descriptionText} numberOfLines={1}>
          {description}
        </SproutText>

        <View
          style={[
            styles.badgePill,
            isSettled
              ? styles.badgeSettled
              : isOwed
              ? styles.badgeOwed
              : styles.badgeOwes,
          ]}
        >
          <SproutText
            style={[
              styles.badgeText,
              isSettled
                ? styles.badgeTextSettled
                : isOwed
                ? styles.badgeTextOwed
                : styles.badgeTextOwes,
            ]}
          >
            {isSettled
              ? 'Settled'
              : isOwed
              ? `+${formatCurrency(netBalance)}`
              : `-${formatCurrency(Math.abs(netBalance))}`}
          </SproutText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2EAE0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E5EFE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#183228',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#6B7A70',
  },
  chevron: {
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF3EC',
    marginVertical: 9,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  descriptionText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#55685C',
    paddingRight: 8,
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSettled: {
    backgroundColor: '#E1EDE0',
  },
  badgeOwed: {
    backgroundColor: '#D8E8CB',
  },
  badgeOwes: {
    backgroundColor: '#F6DDD4',
  },
  badgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
  },
  badgeTextSettled: {
    color: '#2D523C',
  },
  badgeTextOwed: {
    color: '#235634',
  },
  badgeTextOwes: {
    color: '#AF4932',
  },
});


