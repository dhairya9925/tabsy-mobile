import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { SproutText } from './SproutText';

export interface SegmentOption<T = string> {
  value: T;
  label: string;
}

export interface SegmentControlProps<T = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentControl<T = string>({
  options,
  value,
  onChange,
}: SegmentControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              isSelected && styles.segmentSelected,
            ]}
          >
            <SproutText
              variant="caption"
              color={isSelected ? colors.accent : colors.muted}
              weight={isSelected ? '700' : '600'}
              style={styles.label}
            >
              {option.label}
            </SproutText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#DFE9DC',
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 12,
  },
});
