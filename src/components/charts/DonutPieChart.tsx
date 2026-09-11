import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { CategorySlice } from '../../types';
import { colors, chartColors, fontFamilies } from '../../theme';
import { SproutText } from '../SproutText';
import { formatCurrencyExact } from '../../utils/formatters';

interface DonutPieChartProps {
  slices: CategorySlice[];
  total: number;
  size?: number;
  strokeWidth?: number;
  centerSubtitle?: string;
}

interface AnimatedSlice {
  categoryId: string;
  name: string;
  color: string;
  startValue: number;
  targetValue: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const DonutPieChart: React.FC<DonutPieChartProps> = ({
  slices,
  total,
  size = 196,
  strokeWidth = 20,
  centerSubtitle = 'this month',
}) => {
  const radius = size / 2;
  const outerR = radius - 4;
  const innerR = outerR - strokeWidth;
  const midR = (outerR + innerR) / 2;
  const cx = radius;
  const cy = radius;

  const [renderedSlices, setRenderedSlices] = useState<CategorySlice[]>(slices);
  const [renderedTotal, setRenderedTotal] = useState<number>(total);

  const prevSlicesRef = useRef<CategorySlice[]>(slices);
  const prevTotalRef = useRef<number>(total);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prevSlices = prevSlicesRef.current;
    const prevTotal = prevTotalRef.current;

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Build union of all categories between previous and next
    const allCatIds = new Set<string>();
    prevSlices.forEach((s) => allCatIds.add(s.categoryId));
    slices.forEach((s) => allCatIds.add(s.categoryId));

    const sliceMap = new Map<string, CategorySlice>();
    slices.forEach((s) => sliceMap.set(s.categoryId, s));
    const prevSliceMap = new Map<string, CategorySlice>();
    prevSlices.forEach((s) => prevSliceMap.set(s.categoryId, s));

    const animSlices: AnimatedSlice[] = Array.from(allCatIds).map((catId) => {
      const prev = prevSliceMap.get(catId);
      const next = sliceMap.get(catId);
      const name = next?.name || prev?.name || '';
      const color = next?.color || prev?.color || colors.muted;
      const startValue = prev?.value || 0;
      const targetValue = next?.value || 0;
      return {
        categoryId: catId,
        name,
        color,
        startValue,
        targetValue,
      };
    });

    const startTotal = prevTotal;
    const targetTotal = total;
    const duration = 320;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const t = easeOutCubic(progress);

      const currentTotal = startTotal + (targetTotal - startTotal) * t;
      const currentSlices: CategorySlice[] = animSlices
        .map((as) => {
          const val = as.startValue + (as.targetValue - as.startValue) * t;
          return {
            categoryId: as.categoryId,
            name: as.name,
            color: as.color,
            value: Math.max(0, val),
            percentage: currentTotal > 0 ? (Math.max(0, val) / currentTotal) * 100 : 0,
          };
        })
        .filter((s) => (progress < 1 ? s.value > 0.001 : s.value > 0));

      setRenderedSlices(currentSlices);
      setRenderedTotal(currentTotal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevSlicesRef.current = slices;
        prevTotalRef.current = total;
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [slices, total]);

  const validSlices = renderedSlices.filter((s) => s.value > 0.001);

  // If no data, render subtle placeholder track ring
  if (renderedTotal <= 0.001 || validSlices.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={midR}
            fill="none"
            stroke={chartColors.track}
            strokeWidth={strokeWidth}
          />
        </Svg>
        <View style={styles.centerOverlay}>
          <SproutText style={[styles.centerAmount, { color: colors.muted }]}>
            ₹0.00
          </SproutText>
          <SproutText variant="caption" color={colors.muted} style={styles.subtext}>
            No spend yet
          </SproutText>
        </View>
      </View>
    );
  }

  // If single category is 100% of spending
  if (validSlices.length === 1) {
    const single = validSlices[0];
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={midR}
            fill="none"
            stroke={single.color}
            strokeWidth={strokeWidth}
          />
        </Svg>
        <View style={styles.centerOverlay}>
          <SproutText style={styles.centerAmount}>
            {formatCurrencyExact(renderedTotal)}
          </SproutText>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.subtext}>
            {centerSubtitle.toUpperCase()}
          </SproutText>
        </View>
      </View>
    );
  }

  // Multiple slices: compute arc paths starting from top (-90 deg / -pi/2)
  let currentAngle = -Math.PI / 2;

  const paths = validSlices.map((slice) => {
    const sliceAngle = (slice.value / renderedTotal) * (2 * Math.PI);
    // Clamp slice gap relative to slice angle to prevent inversions on very small slices
    const maxPad = sliceAngle * 0.35;
    const actualPad = Math.min(0.03, maxPad);
    const startAngle = currentAngle + actualPad / 2;
    const endAngle = currentAngle + sliceAngle - actualPad / 2;
    currentAngle += sliceAngle;

    // Outer arc endpoints
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    // Inner arc endpoints
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const d = `
      M ${x1.toFixed(2)} ${y1.toFixed(2)}
      A ${outerR.toFixed(2)} ${outerR.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}
      L ${ix1.toFixed(2)} ${iy1.toFixed(2)}
      A ${innerR.toFixed(2)} ${innerR.toFixed(2)} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}
      Z
    `.trim();

    return {
      d,
      color: slice.color,
      categoryId: slice.categoryId,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Underlying subtle base ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={midR}
          fill="none"
          stroke={chartColors.track}
          strokeWidth={strokeWidth}
        />
        <G>
          {paths.map((p) => (
            <Path
              key={p.categoryId}
              d={p.d}
              fill={p.color}
            />
          ))}
        </G>
      </Svg>

      <View style={styles.centerOverlay}>
        <SproutText style={styles.centerAmount}>
          {formatCurrencyExact(renderedTotal)}
        </SproutText>
        <SproutText variant="eyebrow" color={colors.muted} style={styles.subtext}>
          {centerSubtitle.toUpperCase()}
        </SproutText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  centerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  centerAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  },
  subtext: {
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 1.2,
    fontSize: 9,
  },
});
