import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
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
  const padding = isSm ? 2.5 : 3;

  const [containerWidth, setContainerWidth] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === value));

  const animTranslateX = useRef(new Animated.Value(0)).current;
  const isInitialized = useRef(false);

  const availableWidth = Math.max(0, containerWidth - padding * 2);
  const segmentWidth = options.length > 0 && availableWidth > 0 ? availableWidth / options.length : 0;

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (Math.abs(width - containerWidth) > 0.5) {
      setContainerWidth(width);
    }
  };

  useEffect(() => {
    if (segmentWidth <= 0) return;

    const targetX = selectedIndex * segmentWidth;

    if (!isInitialized.current) {
      animTranslateX.setValue(targetX);
      isInitialized.current = true;
      return;
    }

    Animated.spring(animTranslateX, {
      toValue: targetX,
      damping: 24,
      mass: 0.8,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, segmentWidth]);

  const isReady = containerWidth > 0 && segmentWidth > 0;

  return (
    <View
      onLayout={handleContainerLayout}
      style={[
        styles.container,
        isLg && styles.containerLg,
        isSm && styles.containerSm,
        style,
      ]}
    >
      {/* Animated Sliding Pill Indicator with Native Driver */}
      {isReady && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicatorPill,
            isLg ? styles.indicatorPillLg : styles.indicatorPillMd,
            {
              top: padding,
              bottom: padding,
              left: padding,
              width: segmentWidth,
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
            activeOpacity={0.75}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              isLg && styles.segmentLg,
              isSm && styles.segmentSm,
              // Fallback before container width measurement
              !isReady && isSelected && (isLg ? styles.fallbackSelectedLg : styles.fallbackSelected),
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
              numberOfLines={1}
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
