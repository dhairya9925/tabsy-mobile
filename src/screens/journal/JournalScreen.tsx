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
  MonthPickerSheet,
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
  formatMonthTitle,
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
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
  const [showMonthPicker, setShowMonthPicker] = useState(false);
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

  // Current calendar month key (YYYY-MM)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Summary aggregates for All-Months and header stats
  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const totalFilteredSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const totalFilteredDays = useMemo(() => {
    const daySet = new Set<string>();
    filteredExpenses.forEach((e) => {
      const d = (e.expense_date || e.date || '').split('T')[0];
      if (d) daySet.add(d);
    });
    return daySet.size;
  }, [filteredExpenses]);

  // Sequential month navigation indexing (availableMonths is sorted newest first)
  const selectedMonthIndex = useMemo(() => {
    if (selectedMonth === 'all') return -1;
    return availableMonths.findIndex((m) => m.key === selectedMonth);
  }, [selectedMonth, availableMonths]);

  const hasPrevMonth = useMemo(() => {
    if (availableMonths.length === 0) return false;
    if (selectedMonth === 'all') return availableMonths.length > 0;
    return selectedMonthIndex < availableMonths.length - 1;
  }, [availableMonths, selectedMonth, selectedMonthIndex]);

  const hasNextMonth = useMemo(() => {
    if (availableMonths.length === 0) return false;
    if (selectedMonth === 'all') return false;
    return selectedMonthIndex > 0;
  }, [availableMonths, selectedMonth, selectedMonthIndex]);

  const handlePrevMonth = () => {
    if (availableMonths.length === 0) return;
    if (selectedMonth === 'all') {
      setSelectedMonth(availableMonths[0].key);
    } else if (selectedMonthIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[selectedMonthIndex + 1].key);
    }
  };

  const handleNextMonth = () => {
    if (availableMonths.length === 0) return;
    if (selectedMonth === 'all') return;
    if (selectedMonthIndex > 0) {
      setSelectedMonth(availableMonths[selectedMonthIndex - 1].key);
    }
  };

  const activeSingleSection = useMemo(() => {
    if (selectedMonth === 'all') return null;
    return monthSections.find((s) => s.monthKey === selectedMonth) || monthSections[0] || null;
  }, [selectedMonth, monthSections]);

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

      {/* Sleek Botanical Month Navigator Strip */}
      <View style={styles.monthNavRow}>
        <View style={[styles.monthCapsule, isDark && styles.monthCapsuleDark]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePrevMonth}
            disabled={!hasPrevMonth}
            style={[styles.monthChevronBtn, !hasPrevMonth && styles.monthChevronDisabled]}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft
              size={18}
              color={hasPrevMonth ? (isDark ? colors.accent : colors.text) : (isDark ? '#2D4C3A' : '#C5D6C1')}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setShowMonthPicker(true)}
            style={styles.monthLabelBtn}
            accessibilityLabel="Choose ledger month"
          >
            <Calendar
              size={14}
              color={isDark ? colors.accent : '#355E47'}
              style={{ marginRight: 6 }}
            />
            <SproutText
              style={[styles.monthLabelText, isDark && { color: '#FFFFFF' }]}
              numberOfLines={1}
            >
              {selectedMonth === 'all' ? 'All Months' : formatMonthTitle(selectedMonth)}
            </SproutText>
            <ChevronDown
              size={14}
              color={isDark ? '#A5D2C8' : colors.muted}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNextMonth}
            disabled={!hasNextMonth}
            style={[styles.monthChevronBtn, !hasNextMonth && styles.monthChevronDisabled]}
            accessibilityLabel="Next month"
          >
            <ChevronRight
              size={18}
              color={hasNextMonth ? (isDark ? colors.accent : colors.text) : (isDark ? '#2D4C3A' : '#C5D6C1')}
            />
          </TouchableOpacity>
        </View>

        {/* View All / Month View Toggle Pill */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            if (selectedMonth === 'all') {
              const latest = availableMonths[0]?.key || currentMonthKey;
              setSelectedMonth(latest);
            } else {
              setSelectedMonth('all');
            }
          }}
          style={[
            styles.allTogglePill,
            selectedMonth === 'all' && styles.allTogglePillActive,
            isDark && styles.allTogglePillDark,
            isDark && selectedMonth === 'all' && styles.allTogglePillActiveDark,
          ]}
        >
          <SproutText
            variant="caption"
            weight="700"
            style={[
              styles.allToggleText,
              {
                color: selectedMonth === 'all'
                  ? (isDark ? '#12251A' : '#FFFFFF')
                  : (isDark ? '#A5D2C8' : colors.text),
              },
            ]}
          >
            {selectedMonth === 'all' ? 'All Months' : 'View All'}
          </SproutText>
        </TouchableOpacity>
      </View>

      {/* Redesigned Spacious Month Overview Hero Card */}
      {selectedMonth !== 'all' && activeSingleSection && (
        <View
          style={[
            styles.heroCard,
            activeSingleSection.isCurrentMonth
              ? (isDark ? styles.heroCardDarkCurrent : styles.heroCardCurrent)
              : (isDark ? styles.heroCardDarkPast : styles.heroCardPast),
            shadows.card,
          ]}
        >
          {/* Top Row: Concise Eyebrow on left & Clean Live Status Badge on right */}
          <View style={styles.heroCardHeaderRow}>
            <SproutText
              style={[styles.heroCardEyebrow, isDark && { color: '#A5D2C8' }]}
              numberOfLines={1}
            >
              {activeSingleSection.isCurrentMonth
                ? 'ACTIVE LEDGER'
                : activeSingleSection.isPreviousMonth
                  ? 'PREVIOUS MONTH'
                  : 'ARCHIVED RECORD'}
            </SproutText>

            <View
              style={[
                styles.heroStatusBadge,
                activeSingleSection.isCurrentMonth
                  ? (isDark ? styles.heroStatusBadgeDarkCurrent : styles.heroStatusBadgeCurrent)
                  : (isDark ? styles.heroStatusBadgeDarkPast : styles.heroStatusBadgePast),
              ]}
            >
              {activeSingleSection.isCurrentMonth && (
                <View style={[styles.liveDot, isDark && styles.liveDotDark]} />
              )}
              <SproutText
                style={[
                  styles.heroStatusBadgeText,
                  activeSingleSection.isCurrentMonth
                    ? (isDark ? { color: '#FFFFFF' } : { color: '#235634' })
                    : (isDark ? { color: '#A5D2C8' } : { color: '#536D5B' }),
                ]}
              >
                {activeSingleSection.isCurrentMonth ? 'Current' : 'Archived'}
              </SproutText>
            </View>
          </View>

          {/* Primary Hero Metric: Total Amount */}
          <View style={styles.heroAmountBlock}>
            <SproutText style={[styles.heroAmountText, isDark && { color: '#FFFFFF' }]}>
              {formatCurrency(activeSingleSection.totalSpent)}
            </SproutText>
            <SproutText style={[styles.heroAmountSubtext, isDark && { color: '#CBD7CC' }]}>
              Total personal spend in {activeSingleSection.monthTitle}
            </SproutText>
          </View>

          {/* Divider */}
          <View style={[styles.heroCardDivider, isDark && styles.heroCardDividerDark]} />

          {/* 3-Column Stats Grid: Zero overlapping, generous breathing room */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <SproutText style={[styles.heroStatValue, isDark && { color: '#FFFFFF' }]}>
                {activeSingleSection.expenseCount}
              </SproutText>
              <SproutText style={[styles.heroStatLabel, isDark && { color: '#A5D2C8' }]}>
                {activeSingleSection.expenseCount === 1 ? 'EXPENSE' : 'EXPENSES'}
              </SproutText>
            </View>

            <View style={[styles.heroStatDivider, isDark && styles.heroStatDividerDark]} />

            <View style={styles.heroStatCol}>
              <SproutText style={[styles.heroStatValue, isDark && { color: '#FFFFFF' }]}>
                {formatCurrency(Math.round(activeSingleSection.totalSpent / (activeSingleSection.expenseCount || 1)))}
              </SproutText>
              <SproutText style={[styles.heroStatLabel, isDark && { color: '#A5D2C8' }]}>
                AVG / ENTRY
              </SproutText>
            </View>

            <View style={[styles.heroStatDivider, isDark && styles.heroStatDividerDark]} />

            <View style={styles.heroStatCol}>
              <SproutText style={[styles.heroStatValue, isDark && { color: '#FFFFFF' }]}>
                {activeSingleSection.dayGroups.length}
              </SproutText>
              <SproutText style={[styles.heroStatLabel, isDark && { color: '#A5D2C8' }]}>
                {activeSingleSection.dayGroups.length === 1 ? 'DAY LOGGED' : 'DAYS LOGGED'}
              </SproutText>
            </View>
          </View>
        </View>
      )}

      {/* Redesigned Hero Card for "All Months" view */}
      {selectedMonth === 'all' && filteredExpenses.length > 0 && (
        <View
          style={[
            styles.heroCard,
            isDark ? styles.heroCardDarkCurrent : styles.heroCardCurrent,
            shadows.card,
          ]}
        >
          <View style={styles.heroCardHeaderRow}>
            <SproutText
              style={[styles.heroCardEyebrow, isDark && { color: '#A5D2C8' }]}
              numberOfLines={1}
            >
              ALL-TIME OVERVIEW
            </SproutText>

            <View
              style={[
                styles.heroStatusBadge,
                isDark ? styles.heroStatusBadgeDarkCurrent : styles.heroStatusBadgeCurrent,
              ]}
            >
              <SproutText
                style={[
                  styles.heroStatusBadgeText,
                  isDark ? { color: '#FFFFFF' } : { color: '#235634' },
                ]}
              >
                {availableMonths.length} {availableMonths.length === 1 ? 'Month' : 'Months'}
              </SproutText>
            </View>
          </View>

          <View style={styles.heroAmountBlock}>
            <SproutText style={[styles.heroAmountText, isDark && { color: '#FFFFFF' }]}>
              {formatCurrency(totalFilteredSpent)}
            </SproutText>
            <SproutText style={[styles.heroAmountSubtext, isDark && { color: '#CBD7CC' }]}>
              Total personal spending across all months
            </SproutText>
          </View>

          <View style={[styles.heroCardDivider, isDark && styles.heroCardDividerDark]} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <SproutText style={[styles.heroStatValue, isDark && { color: '#FFFFFF' }]}>
                {filteredExpenses.length}
              </SproutText>
              <SproutText style={[styles.heroStatLabel, isDark && { color: '#A5D2C8' }]}>
                {filteredExpenses.length === 1 ? 'ENTRY' : 'ENTRIES'}
              </SproutText>
            </View>

            <View style={[styles.heroStatDivider, isDark && styles.heroStatDividerDark]} />

            <View style={styles.heroStatCol}>
              <SproutText style={[styles.heroStatValue, isDark && { color: '#FFFFFF' }]}>
                {formatCurrency(Math.round(totalFilteredSpent / (filteredExpenses.length || 1)))}
              </SproutText>
              <SproutText style={[styles.heroStatLabel, isDark && { color: '#A5D2C8' }]}>
                OVERALL AVG
              </SproutText>
            </View>

            <View style={[styles.heroStatDivider, isDark && styles.heroStatDividerDark]} />

            <View style={styles.heroStatCol}>
              <SproutText style={[styles.heroStatValue, isDark && { color: '#FFFFFF' }]}>
                {totalFilteredDays}
              </SproutText>
              <SproutText style={[styles.heroStatLabel, isDark && { color: '#A5D2C8' }]}>
                {totalFilteredDays === 1 ? 'DAY LOGGED' : 'DAYS LOGGED'}
              </SproutText>
            </View>
          </View>
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
                {/* 1. Explicit Month Transition Barrier (Between Consecutive Months in All View) */}
                {prevSection && (
                  <View style={styles.monthTransitionContainer}>
                    <View style={styles.transitionLineRow}>
                      <View style={[styles.transitionDashLine, { backgroundColor: colors.line }]} />
                      <View
                        style={[
                          styles.transitionMilestonePill,
                          {
                            backgroundColor: isDark ? '#1F382B' : '#183228',
                            borderColor: isDark ? '#2D4C3A' : '#183228',
                          },
                        ]}
                      >
                        <CheckCircle2
                          size={13}
                          color={isDark ? colors.accent : '#A5D2C8'}
                          strokeWidth={2.5}
                          style={{ marginRight: 6 }}
                        />
                        <SproutText
                          variant="caption"
                          color={isDark ? '#FFFFFF' : '#F6F7ED'}
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

                {/* 2. Sleek Month Section Header (Displayed in All Months view for distinct demarcation) */}
                {selectedMonth === 'all' && (
                  <View style={styles.monthSectionHeader}>
                    <View style={styles.monthSectionHeaderLeft}>
                      <SproutText style={[styles.monthSectionTitle, isDark && { color: '#FFFFFF' }]}>
                        {section.monthTitle}
                      </SproutText>
                      <SproutText variant="caption" color={isDark ? '#A5D2C8' : colors.muted}>
                        {section.expenseCount} {section.expenseCount === 1 ? 'entry' : 'entries'} · {section.dayGroups.length} {section.dayGroups.length === 1 ? 'day' : 'days'} logged
                      </SproutText>
                    </View>
                    <View style={[styles.monthSectionBadge, isDark && styles.monthSectionBadgeDark]}>
                      <SproutText style={[styles.monthSectionBadgeText, isDark && { color: colors.accent }]}>
                        {formatCurrency(section.totalSpent)}
                      </SproutText>
                    </View>
                  </View>
                )}

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

      {/* Month Picker Bottom Sheet */}
      <MonthPickerSheet
        visible={showMonthPicker}
        selectedMonth={selectedMonth}
        months={availableMonths}
        totalExpensesCount={expenses.length}
        totalExpensesAmount={totalExpensesAmount}
        currentMonthKey={currentMonthKey}
        onSelectMonth={(m) => setSelectedMonth(m)}
        onClose={() => setShowMonthPicker(false)}
      />
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
  /* Month Navigation Strip */
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  monthCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DFE9DC',
    borderRadius: radii.full,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  monthCapsuleDark: {
    backgroundColor: '#1E362A',
  },
  monthChevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChevronDisabled: {
    opacity: 0.35,
  },
  monthLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 1,
  },
  monthLabelText: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: '#183228',
    letterSpacing: -0.2,
  },
  allTogglePill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allTogglePillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  allTogglePillDark: {
    backgroundColor: '#1E362A',
    borderColor: '#2D4C3A',
  },
  allTogglePillActiveDark: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  allToggleText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },

  /* Redesigned Spacious Hero Card */
  heroCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: spacing.md,
  },
  heroCardCurrent: {
    backgroundColor: '#D8E8CB',
  },
  heroCardPast: {
    backgroundColor: '#E4EFE0',
  },
  heroCardDarkCurrent: {
    backgroundColor: '#1B3528',
  },
  heroCardDarkPast: {
    backgroundColor: '#162820',
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 10,
  },
  heroCardEyebrow: {
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#466B53',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#235634',
    marginRight: 5,
  },
  liveDotDark: {
    backgroundColor: '#A5D2C8',
  },
  heroStatusBadgeCurrent: {
    backgroundColor: '#FFFFFF',
  },
  heroStatusBadgePast: {
    backgroundColor: '#D0E0CC',
  },
  heroStatusBadgeDarkCurrent: {
    backgroundColor: '#234F35',
  },
  heroStatusBadgeDarkPast: {
    backgroundColor: '#20382B',
  },
  heroStatusBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  heroAmountBlock: {
    marginBottom: 14,
  },
  heroAmountText: {
    fontSize: 32,
    fontFamily: fontFamilies.bold,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: '#183228',
  },
  heroAmountSubtext: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: '#536D5B',
    marginTop: 2,
  },
  heroCardDivider: {
    height: 1,
    backgroundColor: 'rgba(24, 50, 40, 0.08)',
    marginBottom: 14,
  },
  heroCardDividerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#183228',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.6,
    color: '#536D5B',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(24, 50, 40, 0.1)',
  },
  heroStatDividerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  /* Month Section Header (for All Months view) */
  monthSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: spacing.xs,
  },
  monthSectionHeaderLeft: {
    gap: 2,
  },
  monthSectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.3,
    color: colors.text,
  },
  monthSectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  monthSectionBadgeDark: {
    backgroundColor: '#1E362A',
    borderColor: '#2D4C3A',
  },
  monthSectionBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: colors.accent,
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
