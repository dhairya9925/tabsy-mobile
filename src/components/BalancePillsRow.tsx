import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrency } from '../utils/formatters';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

export interface BalancePillsRowProps {
  toReceive?: number;
  toPay?: number;
  onPressReceive?: () => void;
  onPressPay?: () => void;
}

export const BalancePillsRow: React.FC<BalancePillsRowProps> = ({
  toReceive = 0,
  toPay = 0,
  onPressReceive,
  onPressPay,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressReceive}
        disabled={!onPressReceive}
        style={[styles.pill, styles.pillReceive]}
      >
        <View style={styles.iconCircleReceive}>
          <ArrowDownLeft size={16} color={colors.accent} />
        </View>
        <View style={styles.pillContent}>
          <SproutText variant="caption" color={colors.muted} style={styles.pillLabel}>
            YOU'RE OWED
          </SproutText>
          <SproutText variant="subtitle" color={colors.text} weight="700">
            {formatCurrency(toReceive)}
          </SproutText>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressPay}
        disabled={!onPressPay}
        style={[styles.pill, styles.pillPay]}
      >
        <View style={styles.iconCirclePay}>
          <ArrowUpRight size={16} color={colors.negative} />
        </View>
        <View style={styles.pillContent}>
          <SproutText variant="caption" color={colors.muted} style={styles.pillLabel}>
            YOU OWE
          </SproutText>
          <SproutText variant="subtitle" color={colors.text} weight="700">
            {formatCurrency(toPay)}
          </SproutText>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  pillReceive: {
    backgroundColor: colors.soft, // Tender leaf green #D8E8CB
    borderColor: '#C3D9B5',
  },
  pillPay: {
    backgroundColor: colors.clay, // Soft peach #F4DACD
    borderColor: '#E7C5B5',
  },
  iconCircleReceive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF88',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconCirclePay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF88',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  pillContent: {
    flex: 1,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
});
