import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamilies, colors, spacing } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrency } from '../utils/formatters';

export interface MonthlyPaceCardProps {
  spent: number;
  budget: number;
  onPress?: () => void;
}

export const MonthlyPaceCard: React.FC<MonthlyPaceCardProps> = ({
  spent,
  budget,
  onPress,
}) => {
  const remaining = Math.max(0, budget - spent);
  const percentageUsed = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  // Calculate SVG pie slice path
  const size = 62;
  const r = size / 2;
  const angle = (percentageUsed / 100) * 2 * Math.PI;
  const x = r + r * Math.sin(angle);
  const y = r - r * Math.cos(angle);
  const largeArcFlag = angle > Math.PI ? 1 : 0;
  const piePath =
    percentageUsed >= 100
      ? ''
      : `M ${r} ${r} L ${r} 0 A ${r} ${r} 0 ${largeArcFlag} 1 ${x} ${y} Z`;

  const content = (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <SproutText variant="eyebrow" color="#BDCABF" style={styles.eyebrow}>
          MONTHLY PACE
        </SproutText>
        <SproutText variant="heroPace" style={styles.amountLeft}>
          {formatCurrency(remaining)} left
        </SproutText>
        <SproutText variant="caption" color="#BDCABF" style={styles.subtitle}>
          {percentageUsed}% of plan used
        </SproutText>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.ringContainer}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background Circle */}
            <Circle
              cx={r}
              cy={r}
              r={r}
              fill="#476056"
            />
            {/* Filled Progress Slice */}
            {percentageUsed >= 100 ? (
              <Circle cx={r} cy={r} r={r} fill={colors.sun} />
            ) : percentageUsed > 0 ? (
              <Path d={piePath} fill={colors.sun} />
            ) : null}
          </Svg>

          {/* Centered Percentage Text */}
          <View style={styles.ringTextWrap}>
            <SproutText style={styles.ringNumber}>
              {percentageUsed}
            </SproutText>
            <SproutText style={styles.ringPercent}>
              %
            </SproutText>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.text, // Deep forest green #183228
    borderTopLeftRadius: 24,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leftCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  amountLeft: {
    fontSize: 24,
    fontFamily: fontFamilies.extraBold,
    marginBottom: 4,
    color: '#F6F7ED',
  },
  subtitle: {
    fontSize: 11,
    color: '#BDCABF',
  },
  rightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNumber: {
    fontSize: 15,
    fontFamily: fontFamilies.extraBold,
    color: '#183228',
    lineHeight: 17,
  },
  ringPercent: {
    fontSize: 8,
    fontFamily: fontFamilies.bold,
    color: '#183228',
    marginTop: -2,
  },
});
