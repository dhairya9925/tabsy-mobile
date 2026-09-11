import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  ScreenShell,
  CategoryAllocationBar,
  DonutPieChart,
  SixMonthTrendChart,
  WeeklyRhythmChart,
} from '../../components';
import { getCategoryIcon } from '../../components/ExpenseRow';
import { dashboardApi } from '../../api/dashboard';
import { DashboardData } from '../../types';
import {
  computeCategoryBreakdown,
  computeSixMonthTrend,
  computeWeeklyRhythm,
  computeMonthComparison,
} from '../../utils/analyticsCalculations';
import { formatCurrency, formatCurrencyExact } from '../../utils/formatters';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  Calendar,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react-native';

export const InsightScreen: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryViewMode, setCategoryViewMode] = useState<'all' | 'personal'>('all');

  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const summary = await dashboardApi.getSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations based on dashboard data
  const personalExpenses = useMemo(() => data?.personalExpenses || [], [data]);
  const groupUserSplits = useMemo(() => data?.groupUserSplits || [], [data]);

  // 1. Category breakdown
  const { slices: categorySlices, total: categoryTotal } = useMemo(() => {
    return computeCategoryBreakdown(personalExpenses, groupUserSplits, categoryViewMode);
  }, [personalExpenses, groupUserSplits, categoryViewMode]);

  // 2. 6-Month Trend
  const sixMonthTrend = useMemo(() => {
    return computeSixMonthTrend(personalExpenses, groupUserSplits);
  }, [personalExpenses, groupUserSplits]);

  // 3. Weekly Rhythm
  const weeklyRhythm = useMemo(() => {
    return computeWeeklyRhythm(personalExpenses);
  }, [personalExpenses]);

  // 4. Month comparison
  const monthComparison = useMemo(() => {
    const current = categoryViewMode === 'all'
      ? (data?.unifiedTotal || 0)
      : (data?.personalTotal || 0);
    const prev = categoryViewMode === 'all'
      ? (data?.unifiedPrevMonthTotal || 0)
      : (data?.personalPrevMonthTotal || 0);
    return computeMonthComparison(current, prev);
  }, [data, categoryViewMode]);

  // 5. Net balance formatting
  const netBalance = data?.netBalance ?? 0;
  const netOwed = data?.netOwed ?? 0;
  const netOwes = data?.netOwes ?? 0;
  const isOwed = netBalance > 0.01;
  const isOwing = netBalance < -0.01;

  const displayTotal = categoryViewMode === 'all'
    ? (data?.unifiedTotal ?? categoryTotal)
    : (data?.personalTotal ?? categoryTotal);

  if (isLoading && !isRefreshing && !data) {
    return (
      <ScreenShell contentContainerStyle={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <SproutText variant="caption" color={colors.muted} style={styles.loadingText}>
          Crunching your spending rhythm...
        </SproutText>
      </ScreenShell>
    );
  }

  if (error && !data) {
    return (
      <ScreenShell contentContainerStyle={styles.centerContainer}>
        <SproutText variant="subtitle" color={colors.negative}>
          Unable to load insights
        </SproutText>
        <SproutText variant="bodyMuted" style={styles.errorSubtext}>
          {error}
        </SproutText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadData()}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color={colors.surface} />
          <SproutText variant="buttonSm" color={colors.surface}>
            Retry
          </SproutText>
        </TouchableOpacity>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      contentContainerStyle={styles.container}
      onRefresh={() => loadData(true)}
      isRefreshing={isRefreshing}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent}>
          ANALYTICS
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Where it went.
        </SproutText>
        <SproutText variant="bodyMuted">
          See where your money goes with charts and trends.
        </SproutText>
      </View>

      {/* 2. Hero Total Spend Card */}
      <View style={[styles.heroCard, shadows.card]}>
        <View style={styles.heroHeaderRow}>
          <SproutText variant="eyebrow" color={colors.muted}>
            TOTAL SPEND (THIS MONTH)
          </SproutText>
        </View>

        <SproutText style={styles.heroAmount}>
          {formatCurrencyExact(displayTotal)}
        </SproutText>

        <View style={styles.heroFooterRow}>
          <SproutText variant="caption" color={colors.muted} style={styles.heroSubtext}>
            Personal: {formatCurrency(data?.personalTotal || 0)} · Group Share: {formatCurrency(data?.groupShareTotal || 0)}
          </SproutText>

          {monthComparison.trend !== 'same' && (
            <View
              style={[
                styles.trendBadge,
                {
                  backgroundColor: monthComparison.trend === 'less' ? colors.soft : colors.clay,
                },
              ]}
            >
              {monthComparison.trend === 'less' ? (
                <ArrowDownRight size={13} color={colors.accent} />
              ) : (
                <ArrowUpRight size={13} color={colors.negative} />
              )}
              <SproutText
                variant="caption"
                color={monthComparison.trend === 'less' ? colors.accent : colors.negative}
                style={styles.trendText}
              >
                {monthComparison.label}
              </SproutText>
            </View>
          )}
        </View>
      </View>

      {/* 3. Category Breakdown Card */}
      <View style={[styles.card, shadows.card]}>
        {/* Recomposed Vertical Header */}
        <View style={styles.categoryHeader}>
          <View style={styles.headerTitleRow}>
            <PieChartIcon size={18} color={colors.accent} />
            <SproutText variant="subtitle" color={colors.text}>
              Spending by Category
            </SproutText>
          </View>

          {/* Mode Selector - Second row with stretch and equal flex width, minHeight 48 */}
          <View style={styles.categoryToggleBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setCategoryViewMode('all')}
              style={[
                styles.categoryToggleButton,
                categoryViewMode === 'all' && styles.categoryToggleButtonActive,
              ]}
            >
              <SproutText
                variant="caption"
                color={categoryViewMode === 'all' ? colors.text : colors.muted}
                style={categoryViewMode === 'all' ? styles.categoryToggleTextActive : styles.categoryToggleTextInactive}
              >
                All Spending
              </SproutText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setCategoryViewMode('personal')}
              style={[
                styles.categoryToggleButton,
                categoryViewMode === 'personal' && styles.categoryToggleButtonActive,
              ]}
            >
              <SproutText
                variant="caption"
                color={categoryViewMode === 'personal' ? colors.text : colors.muted}
                style={categoryViewMode === 'personal' ? styles.categoryToggleTextActive : styles.categoryToggleTextInactive}
              >
                Personal
              </SproutText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Allocation Bar */}
        <View style={styles.allocationBarContainer}>
          <CategoryAllocationBar slices={categorySlices} />
        </View>

        {/* Donut Chart */}
        <View style={styles.donutWrapper}>
          <DonutPieChart
            slices={categorySlices}
            total={categoryTotal}
            centerSubtitle={categoryViewMode === 'all' ? 'All Spend' : 'Personal'}
          />
        </View>

        {/* Category Legend & List */}
        {categorySlices.length > 0 ? (
          <View style={styles.categoryList}>
            {categorySlices.map((slice) => (
              <View key={slice.categoryId} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: slice.color }]} />
                  <View style={styles.categoryIconWrap}>
                    {getCategoryIcon(slice.categoryId)}
                  </View>
                  <SproutText variant="body" color={colors.text} style={styles.categoryName} numberOfLines={1}>
                    {slice.name}
                  </SproutText>
                </View>

                <View style={styles.categoryRight}>
                  <SproutText style={styles.categoryAmount}>
                    {formatCurrencyExact(slice.value)}
                  </SproutText>
                  <View style={styles.percentageBadge}>
                    <SproutText variant="caption" color={colors.muted} style={styles.percentageText}>
                      {slice.percentage}%
                    </SproutText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCategories}>
            <SproutText variant="caption" color={colors.muted}>
              No expenses logged this month
            </SproutText>
          </View>
        )}
      </View>

      {/* 4. 6-Month Spending Trend */}
      <View style={[styles.card, shadows.card]}>
        <View style={styles.trendHeader}>
          <View style={styles.headerTitleRow}>
            <TrendingUp size={18} color={colors.accent} />
            <SproutText variant="subtitle" color={colors.text}>
              6-Month Spending Trend
            </SproutText>
          </View>
          <SproutText variant="caption" color={colors.muted} style={styles.trendSub}>
            Personal vs. Group share spend over the last 6 months
          </SproutText>
        </View>

        <SixMonthTrendChart data={sixMonthTrend} />
      </View>

      {/* 5. Weekly Rhythm */}
      <View style={[styles.card, shadows.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <Calendar size={18} color={colors.accent} />
            <SproutText variant="subtitle" color={colors.text}>
              Weekly Spending Rhythm
            </SproutText>
          </View>
        </View>

        <WeeklyRhythmChart
          days={weeklyRhythm.days}
          daysLogged={weeklyRhythm.daysLogged}
          maxDayAmount={weeklyRhythm.maxDayAmount}
        />
      </View>

      {/* 6. Financial Snapshot / Net Balance */}
      <View style={[styles.snapshotCard, shadows.card]}>
        <View style={styles.snapshotHeader}>
          <Wallet size={18} color={colors.accent} />
          <SproutText variant="eyebrow" color={colors.text}>
            FINANCIAL SNAPSHOT
          </SproutText>
        </View>

        <View style={styles.balanceSummaryRow}>
          <View
            style={[
              styles.balancePill,
              { backgroundColor: isOwed ? colors.soft : isOwing ? colors.clay : colors.surface },
            ]}
          >
            <SproutText variant="eyebrow" color={isOwed ? colors.accent : isOwing ? colors.negative : colors.muted}>
              NET POSITION
            </SproutText>
            <SproutText
              variant="subtitle"
              color={isOwed ? colors.accent : isOwing ? colors.negative : colors.text}
              style={styles.netAmount}
            >
              {isOwed
                ? `+${formatCurrencyExact(netBalance)}`
                : isOwing
                ? `-${formatCurrencyExact(Math.abs(netBalance))}`
                : 'All Settled ✓'}
            </SproutText>
          </View>
        </View>

        <View style={styles.debtBreakdown}>
          <View style={styles.debtItem}>
            <SproutText variant="caption" color={colors.muted}>
              You're owed
            </SproutText>
            <SproutText variant="monoSm" color={colors.accent}>
              {formatCurrency(netOwed)}
            </SproutText>
          </View>

          <View style={styles.debtDivider} />

          <View style={styles.debtItem}>
            <SproutText variant="caption" color={colors.muted}>
              You owe
            </SproutText>
            <SproutText variant="monoSm" color={colors.negative}>
              {formatCurrency(netOwes)}
            </SproutText>
          </View>

          <View style={styles.debtDivider} />

          <View style={styles.debtItem}>
            <SproutText variant="caption" color={colors.muted}>
              Active balances
            </SproutText>
            <SproutText variant="monoSm" color={colors.text}>
              {data?.unsettledCount ?? 0}
            </SproutText>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 116,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingBottom: 116,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorSubtext: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    marginVertical: 4,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderTopRightRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroHeaderRow: {
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    color: colors.text,
    marginVertical: 4,
  },
  heroFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 6,
  },
  heroSubtext: {
    flexShrink: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoryHeader: {
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryToggleBar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.md,
  },
  categoryToggleButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xs,
  },
  categoryToggleButtonActive: {
    backgroundColor: colors.surface,
    elevation: 1,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  categoryToggleTextActive: {
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
    color: colors.text,
  },
  categoryToggleTextInactive: {
    fontFamily: fontFamilies.medium,
    fontWeight: '500',
    color: colors.muted,
  },
  allocationBarContainer: {
    marginBottom: spacing.md,
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  categoryList: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryIconWrap: {
    marginRight: 8,
  },
  categoryName: {
    flexShrink: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryAmount: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.text,
  },
  percentageBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  trendHeader: {
    marginBottom: spacing.md,
  },
  trendSub: {
    marginTop: 4,
  },
  snapshotCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  snapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  balanceSummaryRow: {
    marginBottom: spacing.md,
  },
  balancePill: {
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  netAmount: {
    marginTop: 4,
    fontWeight: '800',
  },
  debtBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  debtItem: {
    alignItems: 'center',
    flex: 1,
  },
  debtDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.line,
  },
});
