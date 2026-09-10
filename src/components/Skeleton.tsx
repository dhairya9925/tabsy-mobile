import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  variant?: 'rect' | 'circle' | 'text';
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  variant = 'rect',
  style,
}) => {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  const computedRadius =
    variant === 'circle'
      ? typeof height === 'number'
        ? height / 2
        : radii.full
      : variant === 'text'
      ? 4
      : borderRadius;

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height,
          borderRadius: computedRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <View style={[styles.cardSkeleton, shadows.card]}>
      <Skeleton width={100} height={12} variant="text" style={{ marginBottom: spacing.sm }} />
      <Skeleton width={180} height={32} style={{ marginBottom: spacing.md }} />
      <Skeleton width={140} height={14} variant="text" />
    </View>
  );
};

export const ExpenseListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={`exp-skel-${idx}`} style={styles.expenseRowSkeleton}>
          <Skeleton width={40} height={40} variant="circle" />
          <View style={styles.expenseTextSkeleton}>
            <Skeleton width="60%" height={14} variant="text" style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={11} variant="text" />
          </View>
          <Skeleton width={64} height={16} borderRadius={6} />
        </View>
      ))}
    </View>
  );
};

export const GroupListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={`grp-skel-${idx}`} style={[styles.groupCardSkeleton, shadows.card]}>
          <View style={styles.groupCardTop}>
            <Skeleton width={38} height={38} variant="circle" />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="50%" height={15} variant="text" style={{ marginBottom: 6 }} />
              <Skeleton width="30%" height={11} variant="text" />
            </View>
            <Skeleton width={70} height={22} borderRadius={radii.full} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: colors.line,
  },
  cardSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderTopRightRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  listSkeleton: {
    gap: spacing.sm,
  },
  expenseRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  expenseTextSkeleton: {
    flex: 1,
    marginLeft: spacing.md,
  },
  groupCardSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderTopRightRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  groupCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
