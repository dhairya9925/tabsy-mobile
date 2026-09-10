import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { fontFamilies, colors, spacing } from '../theme';
import { SproutText } from './SproutText';
import { formatCurrency } from '../utils/formatters';

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
        <SproutText style={styles.pillText}>
          {formatCurrency(toReceive)} to receive
        </SproutText>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressPay}
        disabled={!onPressPay}
        style={[styles.pill, styles.pillPay]}
      >
        <SproutText style={styles.pillText}>
          {formatCurrency(toPay)} to pay
        </SproutText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillReceive: {
    backgroundColor: '#D8E8CB', // Soft tender sage
  },
  pillPay: {
    backgroundColor: '#F4DACD', // Soft peach blush
  },
  pillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#183228',
    textAlign: 'center',
  },
});
