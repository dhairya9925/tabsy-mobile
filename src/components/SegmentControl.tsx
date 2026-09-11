import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { StyleProp, ViewStyle } from 'react-native';

export interface SegmentOption<T = string> {
  value: T;
  label: string;
}

export interface SegmentControlProps<T = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentControl<T = string>({
  options,
  value,
  onChange,
  style,
  size = 'md',
}: SegmentControlProps<T>) {
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.container,
        isLg && styles.containerLg,
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              isLg && styles.segmentLg,
              isSelected && (isLg ? styles.segmentSelectedLg : styles.segmentSelected),
            ]}
          >
            <SproutText
              style={[
                styles.label,
                isLg && styles.labelLg,
                {
                  color: isSelected
                    ? (isLg ? '#183228' : colors.accent)
                    : (isLg ? '#5D6E62' : colors.muted),
                  fontFamily: isSelected ? fontFamilies.bold : fontFamilies.medium,
                },
              ]}
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
  },
  containerLg: {
    backgroundColor: '#DFE7DC',
    borderRadius: 14,
    padding: 3,
    minHeight: 42,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  segmentLg: {
    minHeight: 36,
    borderRadius: 11,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentSelectedLg: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1.5,
  },
  label: {
    fontSize: 12,
  },
  labelLg: {
    fontSize: 13,
  },
});

