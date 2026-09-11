import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, spacing } from '../theme';
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

export function getGroupIcon(type?: string | null, size = 18, color: string = colors.accent) {
  switch (type) {
    case 'shared_living':
      return <Home size={size} color={color} strokeWidth={1.7} />;
    case 'trip':
      return <Plane size={size} color={color} strokeWidth={1.7} />;
    case 'event':
      return <PartyPopper size={size} color={color} strokeWidth={1.7} />;
    case 'reimbursable':
      return <Receipt size={size} color={color} strokeWidth={1.7} />;
    case 'day_to_day':
    default:
      return <Coffee size={size} color={color} strokeWidth={1.7} />;
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
  const subText = group.description
    ? `${typeMeta.label} · ${memberLabel} · ${group.description}`
    : `${typeMeta.label} · ${memberLabel}`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      <View style={styles.iconCircle}>
        {getGroupIcon(group.type, 18, colors.accent)}
      </View>

      <View style={styles.infoCol}>
        <SproutText style={styles.title} numberOfLines={1}>
          {group.name}
        </SproutText>
        <SproutText style={styles.subtitle} numberOfLines={1}>
          {subText}
        </SproutText>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.balanceCol}>
          {isSettled ? (
            <SproutText style={styles.settledText}>
              All settled ✓
            </SproutText>
          ) : isOwed ? (
            <>
              <SproutText style={styles.amountOwed}>
                +{formatCurrency(netBalance)}
              </SproutText>
              <SproutText style={styles.foot}>
                you're owed
              </SproutText>
            </>
          ) : (
            <>
              <SproutText style={styles.amountOwes}>
                -{formatCurrency(Math.abs(netBalance))}
              </SproutText>
              <SproutText style={styles.foot}>
                you owe
              </SproutText>
            </>
          )}
        </View>
        <ChevronRight size={16} color={colors.muted} strokeWidth={1.7} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 55,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD7CC',
  },
  iconCircle: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#183228',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#6D7C72',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  settledText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#6D7C72',
  },
  amountOwed: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.accent,
  },
  amountOwes: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.negative,
  },
  foot: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 6,
  },
});
