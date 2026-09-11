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
}

export function SegmentControl<T = string>({
  options,
  value,
  onChange,
  style,
}: SegmentControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
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
              style={[
                styles.label,
                {
                  color: isSelected ? colors.accent : colors.muted,
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
  segment: {
    flex: 1,
    minHeight: 40,
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
