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
          {/* Top Header Row matching GroupCard */}
          <View style={styles.groupCardTop}>
            <Skeleton width={37} height={37} borderRadius={radii.md} />
            <View style={styles.groupCardInfo}>
              <Skeleton width="55%" height={14} style={{ marginBottom: 5 }} />
              <Skeleton width="38%" height={11} />
            </View>
            <Skeleton width={14} height={14} variant="circle" />
          </View>

          {/* Hairline Divider */}
          <View style={styles.groupCardDivider} />

          {/* Bottom Footer Row */}
          <View style={styles.groupCardBottom}>
            <Skeleton width="45%" height={11} />
            <Skeleton width={64} height={18} borderRadius={radii.full} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const MonthlyHouseholdLedgerSkeleton: React.FC = () => {
  return (
    <View style={styles.ledgerSkeletonContainer}>
      {/* 1. Hero Action Slip Card Skeleton (Deep Forest Green card matching HeroActionSlipCard) */}
      <View style={[styles.heroSlipSkeleton, shadows.card]}>
        {/* Header Eyebrow Row */}
        <View style={styles.heroSlipHeaderRow}>
          <Skeleton width={96} height={10} style={styles.darkSkeletonItem} />
          <Skeleton width={44} height={10} style={styles.darkSkeletonItem} />
        </View>

        {/* Hero Body Row */}
        <View style={styles.heroSlipBodyRow}>
          <View style={styles.heroSlipLeftCol}>
            <Skeleton width={80} height={9} style={[styles.darkSkeletonItem, { marginBottom: 6 }]} />
            <Skeleton width={140} height={26} style={[styles.darkSkeletonItemHighlight, { marginBottom: 6 }]} />
            <Skeleton width={100} height={11} style={styles.darkSkeletonItem} />
          </View>

          {/* Circular Dial Placeholder */}
          <Skeleton width={50} height={50} variant="circle" style={styles.darkSkeletonItem} />
        </View>

        {/* Bottom Status Bar Skeleton */}
        <View style={styles.heroSlipStatusBar}>
          <Skeleton width={110} height={14} borderRadius={radii.full} style={styles.darkSkeletonItem} />
          <Skeleton width={64} height={14} borderRadius={radii.full} style={styles.darkSkeletonItem} />
        </View>
      </View>

      {/* 2. Monthly Ledger Table Skeleton (Warm White Card matching MonthlyLedgerTable) */}
      <View style={[styles.ledgerTableSkeleton, shadows.card]}>
        {/* Table Header */}
        <View style={styles.ledgerTableHeader}>
          <View>
            <Skeleton width={90} height={8} style={{ marginBottom: 4 }} />
            <Skeleton width={120} height={15} />
          </View>
          <Skeleton width={62} height={18} borderRadius={radii.full} />
        </View>

        {/* Member Rows */}
        {Array.from({ length: 4 }).map((_, idx) => (
          <View
            key={`ledger-row-skel-${idx}`}
            style={[
              styles.ledgerTableRowSkeleton,
              idx === 3 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.ledgerTableRowLeft}>
              <Skeleton width={22} height={22} variant="circle" />
              <View style={styles.ledgerTableRowNameBlock}>
                <Skeleton width={idx % 2 === 0 ? 95 : 75} height={12} style={{ marginBottom: 3 }} />
                <Skeleton width={idx === 0 ? 35 : 45} height={8} />
              </View>
            </View>

            <View style={styles.ledgerTableRowRight}>
              <Skeleton width={52} height={16} borderRadius={6} style={{ marginRight: 6 }} />
              <Skeleton width={46} height={16} borderRadius={10} style={{ marginRight: 4 }} />
              <Skeleton width={10} height={10} variant="circle" />
            </View>
          </View>
        ))}
      </View>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.sm,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  groupCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  groupCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  groupCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerSkeletonContainer: {
    gap: 6,
  },
  heroSlipSkeleton: {
    backgroundColor: colors.text, // Signature Deep forest green #183228
    borderTopLeftRadius: 24,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 13,
    marginBottom: 6,
  },
  heroSlipHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroSlipBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 8,
  },
  heroSlipLeftCol: {
    flex: 1,
    paddingRight: 6,
  },
  heroSlipStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3C30',
    borderRadius: radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  darkSkeletonItem: {
    backgroundColor: '#264335',
  },
  darkSkeletonItemHighlight: {
    backgroundColor: '#335443',
  },
  ledgerTableSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ledgerTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ledgerTableRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ledgerTableRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  ledgerTableRowNameBlock: {
    marginLeft: 6,
    flex: 1,
  },
  ledgerTableRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
