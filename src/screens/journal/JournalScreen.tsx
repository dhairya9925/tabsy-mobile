import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { JournalStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  ScreenShell,
  ExpenseRow,
  FieldRow,
  CircleButton,
  AvatarCircle,
  Toast,
  ExpenseListSkeleton,
  EmptyState,
} from '../../components';
import { expensesApi } from '../../api/expenses';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { PersonalExpense, Category } from '../../types';
import { formatCurrency, toLocalDateString } from '../../utils/formatters';
import {
  extractAvailableMonths,
  groupExpensesByMonth,
  getMonthKeyFromDate,
} from '../../utils/journalGrouping';
import {
  Search,
  SlidersHorizontal,
  Tag,
  Wallet,
  X,
  CalendarDays,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalList'>;

export const JournalScreen: React.FC<Props> = ({ navigation }) => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [expData, catData] = await Promise.all([
        expensesApi.getPersonalExpenses(),
        expensesApi.getCategories().catch(() => []),
      ]);
      setExpenses(expData);
      setCategories(catData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load personal expenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Extract all available months from expenses for the quick-filter bar
  const availableMonths = useMemo(() => {
    return extractAvailableMonths(expenses);
  }, [expenses]);

  // Client-side category, month & search filtering
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const catMatches =
        selectedCategory === 'all' ||
        (typeof item.category === 'string' &&
          item.category.toLowerCase() === selectedCategory.toLowerCase());

      const expDate = item.expense_date || item.date || '';
      const monthMatches =
        selectedMonth === 'all' || getMonthKeyFromDate(expDate) === selectedMonth;

      const desc = item.description || item.note || item.category || '';
      const searchMatches =
        !searchQuery.trim() ||
        desc.toLowerCase().includes(searchQuery.trim().toLowerCase());

      return catMatches && monthMatches && searchMatches;
    });
  }, [expenses, selectedCategory, selectedMonth, searchQuery]);

  // Group filtered expenses hierarchically by month and days
  const monthSections = useMemo(() => {
    return groupExpensesByMonth(filteredExpenses);
  }, [filteredExpenses]);

  return (
    <ScreenShell
      isRefreshing={isLoading}
      onRefresh={loadData}
      contentContainerStyle={styles.container}
    >
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            PERSONAL
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            Expenses
          </SproutText>
        </View>

        <View style={styles.headerActions}>
          <CircleButton
            icon={<Tag size={18} color={colors.accent} />}
            onPress={() => rootNavigation.navigate('CategoryManager')}
            style={styles.actionCircle}
            accessibilityLabel="Manage categories"
          />
          <CircleButton
            icon={<SlidersHorizontal size={18} color={showFilterBar ? colors.accent : colors.text} />}
            onPress={() => setShowFilterBar((v) => !v)}
            style={styles.actionCircle}
            accessibilityLabel="Filter expenses"
          />
          <AvatarCircle
            name={currentUser?.display_name}
            email={currentUser?.email}
            avatarUrl={currentUser?.avatar_url}
            size={44}
            onPress={() => rootNavigation.navigate('Profile')}
          />
        </View>
      </View>

      {/* Collapsible Search & Category Filter Section */}
      {showFilterBar && (
        <View style={styles.filterCard}>
          <FieldRow
            placeholder="Search notes, categories, or amounts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={18} color={colors.muted} />}
            rightAction={
              searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.muted} />
                </TouchableOpacity>
              ) : undefined
            }
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPills}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedCategory('all')}
              style={[
                styles.categoryPill,
                selectedCategory === 'all' && styles.categoryPillSelected,
              ]}
            >
              <SproutText
                variant="caption"
                color={selectedCategory === 'all' ? colors.onAccent : colors.text}
                weight="700"
              >
                All Categories
              </SproutText>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(cat.name)}
                  style={[
                    styles.categoryPill,
                    isSelected && styles.categoryPillSelected,
                  ]}
                >
                  <SproutText
                    variant="caption"
                    color={isSelected ? colors.onAccent : colors.text}
                    weight="700"
                  >
                    {cat.name}
                  </SproutText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Month Quick Filter Chips Bar */}
      {availableMonths.length > 1 && (
        <View style={styles.monthFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthFilterScroll}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedMonth('all')}
              style={[
                styles.monthFilterChip,
                selectedMonth === 'all' && styles.monthFilterChipActive,
              ]}
            >
              <SproutText
                variant="caption"
                color={selectedMonth === 'all' ? colors.onAccent : colors.text}
                weight="700"
              >
                All Months
              </SproutText>
              <View
                style={[
                  styles.monthFilterBadge,
                  selectedMonth === 'all' && styles.monthFilterBadgeActive,
                ]}
              >
                <SproutText
                  variant="caption"
                  color={selectedMonth === 'all' ? colors.accent : colors.muted}
                  style={styles.monthFilterBadgeText}
                >
                  {expenses.length}
                </SproutText>
              </View>
            </TouchableOpacity>

            {availableMonths.map((m) => {
              const isSelected = selectedMonth === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMonth(m.key)}
                  style={[
                    styles.monthFilterChip,
                    isSelected && styles.monthFilterChipActive,
                  ]}
                >
                  <SproutText
                    variant="caption"
                    color={isSelected ? colors.onAccent : colors.text}
                    weight="700"
                  >
                    {m.label}
                  </SproutText>
                  <View
                    style={[
                      styles.monthFilterBadge,
                      isSelected && styles.monthFilterBadgeActive,
                    ]}
                  >
                    <SproutText
                      variant="caption"
                      color={isSelected ? colors.accent : colors.muted}
                      style={styles.monthFilterBadgeText}
                    >
                      {m.count}
                    </SproutText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Expense Groups by Month & Date or Loading Skeleton */}
      {isLoading && expenses.length === 0 ? (
        <ExpenseListSkeleton count={6} />
      ) : monthSections.length === 0 ? (
        <EmptyState
          card
          icon={<Wallet size={40} color={colors.muted} strokeWidth={1.5} />}
          title={
            searchQuery || selectedCategory !== 'all' || selectedMonth !== 'all'
              ? 'No expenses match your filters.'
              : 'No personal expenses yet.'
          }
          subtitle={
            searchQuery || selectedCategory !== 'all' || selectedMonth !== 'all'
              ? 'Try adjusting or clearing your active filters.'
              : 'Add your first expense to start tracking!'
          }
          actionLabel={
            searchQuery || selectedCategory !== 'all' || selectedMonth !== 'all'
              ? 'Clear Filters'
              : 'Add Expense'
          }
          onActionPress={() => {
            if (searchQuery || selectedCategory !== 'all' || selectedMonth !== 'all') {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedMonth('all');
            } else {
              rootNavigation.navigate('AddExpenseModal');
            }
          }}
          style={{ marginTop: spacing.lg }}
        />
      ) : (
        <View style={styles.groupsContainer}>
          {monthSections.map((section, monthIdx) => {
            const prevSection = monthIdx > 0 ? monthSections[monthIdx - 1] : null;

            return (
              <View key={section.monthKey} style={styles.monthSectionWrap}>
                {/* 1. Explicit Month Transition Barrier (Between Consecutive Months) */}
                {prevSection && (
                  <View style={styles.monthTransitionContainer}>
                    <View style={styles.transitionLineRow}>
                      <View style={[styles.transitionDashLine, { backgroundColor: colors.line }]} />
                      <View
                        style={[
                          styles.transitionMilestonePill,
                          {
                            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                            borderColor: colors.line,
                          },
                        ]}
                      >
                        <CheckCircle2 size={13} color={colors.accent} strokeWidth={2.5} style={{ marginRight: 6 }} />
                        <SproutText
                          variant="caption"
                          color={colors.text}
                          weight="800"
                          style={styles.transitionMilestoneText}
                        >
                          END OF {prevSection.monthTitle.toUpperCase()}
                        </SproutText>
                      </View>
                      <View style={[styles.transitionDashLine, { backgroundColor: colors.line }]} />
                    </View>

                    <View style={styles.transitionNoticeRow}>
                      <ArrowDown size={12} color={colors.muted} />
                      <SproutText variant="caption" color={colors.muted} style={styles.transitionNoticeText}>
                        Earlier Activity · {section.monthTitle} below
                      </SproutText>
                    </View>
                  </View>
                )}

                {/* 2. Signature Sprout Month Banner Card (matching Groups banner style) */}
                <View
                  style={[
                    styles.groupStyleBanner,
                    section.isCurrentMonth
                      ? (isDark ? styles.bannerDarkCurrent : styles.bannerCurrent)
                      : (isDark ? styles.bannerDarkPast : styles.bannerPast),
                    shadows.card,
                  ]}
                >
                  {/* Top Row: Eyebrow on left & Action buttons (Calendar Circle + Total Amount Badge) on right */}
                  <View style={styles.bannerTopRow}>
                    <SproutText style={[styles.bannerEyebrow, isDark && { color: '#A5D2C8' }]}>
                      {section.isCurrentMonth ? 'Active ledger' : 'Archived ledger'}
                    </SproutText>

                    <View style={styles.bannerTopRightActions}>
                      <View style={[styles.bannerCircleBtn, isDark && { backgroundColor: '#284637' }]}>
                        <CalendarDays
                          size={13}
                          color={isDark ? '#A5D2C8' : '#183228'}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View style={[styles.bannerCornerBadge, isDark && { backgroundColor: '#284637' }]}>
                        <SproutText style={[styles.bannerCornerBadgeText, isDark && { color: colors.accent }]}>
                          {formatCurrency(section.totalSpent)}
                        </SproutText>
                      </View>
                    </View>
                  </View>

                  {/* Main Heading: Month Name in bold 24px */}
                  <View style={styles.bannerTitleRow}>
                    <SproutText style={[styles.bannerMonthName, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                      {section.monthTitle}
                    </SproutText>
                  </View>

                  {/* Subtitle: Count and Average */}
                  <SproutText style={[styles.bannerDescription, isDark && { color: '#CBD7CC' }]} numberOfLines={1}>
                    {section.expenseCount} {section.expenseCount === 1 ? 'expense' : 'expenses'} recorded · Avg ~{formatCurrency(Math.round(section.totalSpent / (section.expenseCount || 1)))} per entry
                  </SproutText>

                  {/* Bottom Row: Category bubbles on left & Status pill button on right */}
                  <View style={styles.bannerBottomRow}>
                    <View style={styles.bannerBottomLeft}>
                      <View style={styles.bannerCatCluster}>
                        {(section.topCategories.length > 0 ? section.topCategories : ['all']).map((cat, idx) => {
                          const initial = cat.charAt(0).toUpperCase();
                          return (
                            <View
                              key={cat + idx}
                              style={[
                                styles.bannerMiniBubble,
                                {
                                  marginLeft: idx === 0 ? 0 : -6,
                                  zIndex: 10 - idx,
                                  backgroundColor: isDark ? '#1F382B' : '#FBFDF7',
                                  borderColor: isDark ? '#2D4C3A' : '#D8E8CB',
                                },
                              ]}
                            >
                              <SproutText style={[styles.bannerMiniInitial, isDark && { color: colors.accent }]}>
                                {initial}
                              </SproutText>
                            </View>
                          );
                        })}
                      </View>
                      <SproutText style={[styles.bannerSubtext, isDark && { color: '#A5D2C8' }]}>
                        {section.dayGroups.length} active {section.dayGroups.length === 1 ? 'day' : 'days'} logged
                      </SproutText>
                    </View>

                    <View
                      style={[
                        styles.bannerPillBtn,
                        {
                          backgroundColor: section.isCurrentMonth
                            ? (isDark ? colors.accent : '#355E47')
                            : (isDark ? '#2D4C3A' : '#536D5B'),
                        },
                      ]}
                    >
                      <SproutText style={styles.bannerPillBtnText}>
                        {section.monthTag === 'CURRENT MONTH' ? 'Current Month' : section.monthTag === 'PREVIOUS MONTH' ? 'Previous Month' : 'Past Record'}
                      </SproutText>
                    </View>
                  </View>
                </View>

                {/* 3. Daily Groups within the Month */}
                <View style={styles.daysList}>
                  {section.dayGroups.map((group) => (
                    <View key={group.dateKey} style={styles.dateGroup}>
                      <View style={styles.dateGroupHeaderRow}>
                        <SproutText variant="eyebrow" color={colors.muted} style={styles.dateGroupHeader}>
                          {group.dateLabel}
                        </SproutText>
                        <SproutText variant="caption" color={colors.muted} style={styles.daySubtotal}>
                          {formatCurrency(group.dayTotal)}
                        </SproutText>
                      </View>
                      <View style={styles.itemsList}>
                        {group.items.map((expense) => (
                          <ExpenseRow
                            key={expense.id}
                            expense={expense}
                            onPress={() => navigation.navigate('ExpenseDetail', { expense })}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                {/* 4. Subtle Month Closure Footer */}
                <View style={[styles.monthFooterSummary, { borderColor: colors.line, backgroundColor: colors.surface }]}>
                  <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, textAlign: 'center' }}>
                    {section.monthTitle}: {section.expenseCount} {section.expenseCount === 1 ? 'entry' : 'entries'} · {formatCurrency(section.totalSpent)} total
                  </SproutText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 116,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#6D7C72',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -1.4,
    color: colors.text,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  categoryPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryPillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  monthFilterContainer: {
    marginBottom: spacing.md,
  },
  monthFilterScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  monthFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  monthFilterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  monthFilterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.background,
  },
  monthFilterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  monthFilterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  groupsContainer: {
    marginTop: spacing.xs,
  },
  monthSectionWrap: {
    marginBottom: spacing.xl,
  },
  monthTransitionContainer: {
    marginVertical: spacing.lg,
    alignItems: 'center',
  },
  transitionLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  transitionDashLine: {
    flex: 1,
    height: 1,
  },
  transitionMilestonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  transitionMilestoneText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  transitionNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  transitionNoticeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  groupStyleBanner: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 18,
    marginBottom: spacing.md,
  },
  bannerCurrent: {
    backgroundColor: '#D8E8CB',
  },
  bannerPast: {
    backgroundColor: '#E4EFE0',
  },
  bannerDarkCurrent: {
    backgroundColor: '#1B3528',
  },
  bannerDarkPast: {
    backgroundColor: '#162820',
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bannerEyebrow: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#536D5B',
  },
  bannerTopRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bannerCornerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bannerCornerBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#235634',
  },
  bannerTitleRow: {
    marginTop: 2,
    marginBottom: 3,
  },
  bannerMonthName: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: '#183228',
  },
  bannerDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#536D5B',
    marginBottom: 14,
  },
  bannerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerCatCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerMiniBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerMiniInitial: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#407A58',
  },
  bannerSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#536D5B',
    marginLeft: 8,
  },
  bannerPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bannerPillBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  daysList: {
    gap: 2,
  },
  dateGroup: {
    marginBottom: spacing.md,
  },
  dateGroupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  dateGroupHeader: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  daySubtotal: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemsList: {
    gap: 4,
  },
  monthFooterSummary: {
    marginTop: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
});
