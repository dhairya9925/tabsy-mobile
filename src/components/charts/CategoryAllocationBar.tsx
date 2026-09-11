import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CategorySlice } from '../../types';
import { chartColors, radii } from '../../theme';

interface CategoryAllocationBarProps {
  slices: CategorySlice[];
  height?: number;
}

interface AnimatedSlice {
  categoryId: string;
  color: string;
  startPercentage: number;
  targetPercentage: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const CategoryAllocationBar: React.FC<CategoryAllocationBarProps> = ({
  slices,
  height = 8,
}) => {
  const [renderedSlices, setRenderedSlices] = useState<CategorySlice[]>(slices);
  const prevSlicesRef = useRef<CategorySlice[]>(slices);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prevSlices = prevSlicesRef.current;

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

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
      const color = next?.color || prev?.color || chartColors.track;
      const startPercentage = prev?.percentage || 0;
      const targetPercentage = next?.percentage || 0;
      return {
        categoryId: catId,
        color,
        startPercentage,
        targetPercentage,
      };
    });

    const duration = 320;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const t = easeOutCubic(progress);

      const currentSlices: CategorySlice[] = animSlices
        .map((as) => {
          const pct = as.startPercentage + (as.targetPercentage - as.startPercentage) * t;
          return {
            categoryId: as.categoryId,
            name: '',
            color: as.color,
            value: 0,
            percentage: Math.max(0, pct),
          };
        })
        .filter((s) => (progress < 1 ? s.percentage > 0.01 : s.percentage > 0));

      setRenderedSlices(currentSlices);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevSlicesRef.current = slices;
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [slices]);

  const validSlices = renderedSlices.filter((s) => s.percentage > 0.05);

  if (validSlices.length === 0) {
    return <View style={[styles.emptyBar, { height }]} />;
  }

  return (
    <View style={[styles.container, { height }]}>
      {validSlices.map((slice, index) => {
        const isFirst = index === 0;
        const isLast = index === validSlices.length - 1;

        return (
          <View
            key={slice.categoryId}
            style={[
              styles.segment,
              {
                flex: slice.percentage,
                backgroundColor: slice.color,
                borderTopLeftRadius: isFirst ? radii.full : 0,
                borderBottomLeftRadius: isFirst ? radii.full : 0,
                borderTopRightRadius: isLast ? radii.full : 0,
                borderBottomRightRadius: isLast ? radii.full : 0,
                marginRight: isLast ? 0 : 2,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: chartColors.track,
  },
  segment: {
    height: '100%',
  },
  emptyBar: {
    width: '100%',
    borderRadius: radii.full,
    backgroundColor: chartColors.track,
  },
});
