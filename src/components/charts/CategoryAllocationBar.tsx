import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CategorySlice } from '../../types';
import { chartColors, radii } from '../../theme';

interface CategoryAllocationBarProps {
  slices: CategorySlice[];
  height?: number;
}

export const CategoryAllocationBar: React.FC<CategoryAllocationBarProps> = ({
  slices,
  height = 8,
}) => {
  if (!slices || slices.length === 0) {
    return (
      <View style={[styles.emptyBar, { height }]} />
    );
  }

  const validSlices = slices.filter((s) => s.percentage > 0);

  if (validSlices.length === 0) {
    return (
      <View style={[styles.emptyBar, { height }]} />
    );
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

