import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, fontFamilies, radii } from '../theme';
import { SproutText } from './SproutText';

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
  const isSm = size === 'sm';

  const [segmentLayouts, setSegmentLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === value));

  const animTranslateX = useRef(new Animated.Value(0)).current;
  const animWidth = useRef(new Animated.Value(0)).current;
  const hasInitialized = useRef(false);

  const handleSegmentLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setSegmentLayouts((prev) => {
      if (prev[index] && Math.abs(prev[index].x - x) < 0.5 && Math.abs(prev[index].width - width) < 0.5) {
        return prev;
      }
      return { ...prev, [index]: { x, width } };
    });
  };

  useEffect(() => {
    const targetLayout = segmentLayouts[selectedIndex];
    if (!targetLayout || targetLayout.width <= 0) return;

    if (!hasInitialized.current) {
      animTranslateX.setValue(targetLayout.x);
      animWidth.setValue(targetLayout.width);
      hasInitialized.current = true;
      return;
    }

    Animated.parallel([
      Animated.timing(animTranslateX, {
        toValue: targetLayout.x,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animWidth, {
        toValue: targetLayout.width,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [selectedIndex, segmentLayouts]);

  return (
    <View
      style={[
        styles.container,
        isLg && styles.containerLg,
        isSm && styles.containerSm,
        style,
      ]}
    >
      {/* Animated Sliding Pill Indicator */}
      {hasInitialized.current && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicatorPill,
            isLg ? styles.indicatorPillLg : styles.indicatorPillMd,
            {
              width: animWidth,
              transform: [{ translateX: animTranslateX }],
            },
          ]}
        />
      )}

      {/* Segment Option Buttons */}
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            onLayout={(e) => handleSegmentLayout(index, e)}
            style={[
              styles.segment,
              isLg && styles.segmentLg,
              isSm && styles.segmentSm,
              // Fallback for initial render before layout measurement
              !hasInitialized.current && isSelected && (isLg ? styles.fallbackSelectedLg : styles.fallbackSelected),
            ]}
          >
            <SproutText
              style={[
                styles.label,
                isLg && styles.labelLg,
                isSm && styles.labelSm,
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
    position: 'relative',
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
  containerSm: {
    backgroundColor: '#DFE9DC',
    borderRadius: radii.full,
    padding: 2.5,
  },
  indicatorPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    zIndex: 1,
  },
  indicatorPillLg: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  indicatorPillMd: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    zIndex: 2,
  },
  segmentLg: {
    minHeight: 36,
    borderRadius: 11,
  },
  segmentSm: {
    minHeight: 30,
    borderRadius: radii.full,
  },
  fallbackSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  fallbackSelectedLg: {
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
  labelSm: {
    fontSize: 11,
  },
});
