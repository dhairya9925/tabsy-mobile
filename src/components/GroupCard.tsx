import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { Group } from '../types';
import { getGroupTypeMeta } from '../utils/groupTypes';
import { formatCurrencyExact } from '../utils/formatters';
import { Home, Plane, Coffee, PartyPopper, Receipt, Users, ChevronRight } from 'lucide-react-native';

export interface GroupCardProps {
  group: Group;
  memberCount?: number;
  netBalance?: number; // >0 you're owed, <0 you owe, 0 settled
  onPress?: () => void;
}

export function getGroupIcon(type?: string | null, size = 20, color: string = colors.accent) {
  switch (type) {
    case 'shared_living':
      return <Home size={size} color={color} />;
    case 'trip':
      return <Plane size={size} color={color} />;
    case 'event':
      return <PartyPopper size={size} color={color} />;
    case 'reimbursable':
      return <Receipt size={size} color={color} />;
    case 'day_to_day':
    default:
      return <Coffee size={size} color={color} />;
  }
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  memberCount = 1,
  netBalance = 0,
  onPress,
}) => {
  const typeMeta = getGroupTypeMeta(group.type);

  let balanceBadgeText: string = 'All settled ✓';
  let balanceBadgeColor: string = colors.muted;
  let balanceBadgeBg: string = '#EAEFE9';

  if (netBalance > 0.01) {
    balanceBadgeText = `You're owed ${formatCurrencyExact(netBalance)}`;
    balanceBadgeColor = colors.accent;
    balanceBadgeBg = colors.soft;
  } else if (netBalance < -0.01) {
    balanceBadgeText = `You owe ${formatCurrencyExact(Math.abs(netBalance))}`;
    balanceBadgeColor = colors.negative;
    balanceBadgeBg = colors.clay;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          {getGroupIcon(group.type)}
        </View>

        <View style={styles.infoCol}>
          <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1}>
            {group.name}
          </SproutText>
          <SproutText variant="caption" color={colors.muted}>
            {typeMeta.label} • {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </SproutText>
        </View>

        <ChevronRight size={18} color={colors.muted} />
      </View>

      <View style={styles.bottomRow}>
        <View style={[styles.balancePill, { backgroundColor: balanceBadgeBg }]}>
          <SproutText
            variant="caption"
            color={balanceBadgeColor}
            weight="700"
            style={styles.balanceText}
          >
            {balanceBadgeText}
          </SproutText>
        </View>
        {group.description ? (
          <SproutText variant="caption" color={colors.muted} numberOfLines={1} style={styles.description}>
            {group.description}
          </SproutText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F0F4EE',
  },
  balancePill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
  balanceText: {
    fontSize: 11,
  },
  description: {
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
});
