import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { JournalStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  ScreenShell,
  ExpenseRow,
  FieldRow,
  CircleButton,
  CategoryChip,
  Toast,
} from '../../components';
import { expensesApi } from '../../api/expenses';
import { PersonalExpense, Category } from '../../types';
import { toLocalDateString } from '../../utils/formatters';
import { Search, SlidersHorizontal, Tag, ReceiptText, PlusCircle, X } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalList'>;

export const JournalScreen: React.FC<Props> = ({ navigation }) => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
      setErrorMessage(err.message || 'Failed to load journal expenses');
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

  // Client-side category & search filtering
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const catMatches =
        selectedCategory === 'all' ||
        (typeof item.category === 'string' &&
          item.category.toLowerCase() === selectedCategory.toLowerCase());

      const desc = item.description || item.note || item.category || '';
      const searchMatches =
        !searchQuery.trim() ||
        desc.toLowerCase().includes(searchQuery.trim().toLowerCase());

      return catMatches && searchMatches;
    });
  }, [expenses, selectedCategory, searchQuery]);

  // Group filtered expenses by date
  const groupedExpenses = useMemo(() => {
    const today = toLocalDateString(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateString(yesterdayDate);

    const groups: { dateLabel: string; items: PersonalExpense[] }[] = [];
    const dateMap = new Map<string, PersonalExpense[]>();

    for (const exp of filteredExpenses) {
      const dateKey = (exp.date || exp.expense_date || '').split('T')[0] || 'Earlier';
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(exp);
    }

    dateMap.forEach((items, dateKey) => {
      let label = dateKey;
      if (dateKey === today) {
        label = 'TODAY';
      } else if (dateKey === yesterday) {
        label = 'YESTERDAY';
      } else {
        const d = new Date(dateKey);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }).toUpperCase();
        }
      }
      groups.push({ dateLabel: label, items });
    });

    return groups;
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
          <SproutText variant="eyebrow" color={colors.accent}>
            PERSONAL LEDGER
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            Journal
          </SproutText>
        </View>

        <View style={styles.headerActions}>
          <CircleButton
            icon={<Tag size={18} color={colors.accent} />}
            onPress={() => navigation.navigate('CategoryManager')}
            style={styles.actionCircle}
          />
          <CircleButton
            icon={<SlidersHorizontal size={18} color={showFilterBar ? colors.accent : colors.text} />}
            onPress={() => setShowFilterBar((v) => !v)}
            style={styles.actionCircle}
          />
        </View>
      </View>

      {/* Collapsible Search & Category Filter Section */}
      {showFilterBar && (
        <View style={styles.filterCard}>
          <FieldRow
            placeholder="Search description or note..."
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
                All
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

      {/* Expense Groups by Date */}
      {groupedExpenses.length === 0 && !isLoading ? (
        <View style={styles.emptyCard}>
          <ReceiptText size={42} color={colors.muted} strokeWidth={1.5} />
          <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
            {searchQuery || selectedCategory !== 'all'
              ? 'No matching entries found'
              : 'No expenses in Journal yet'}
          </SproutText>
          <SproutText variant="caption" color={colors.muted} style={styles.emptySubtitle}>
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Tap the + button to record your first expense entry.'}
          </SproutText>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => rootNavigation.navigate('AddExpenseModal')}
            style={styles.emptyAddBtn}
          >
            <PlusCircle size={18} color={colors.accent} style={{ marginRight: 6 }} />
            <SproutText variant="caption" color={colors.accent} weight="700">
              Add Expense
            </SproutText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.groupsContainer}>
          {groupedExpenses.map((group) => (
            <View key={group.dateLabel} style={styles.dateGroup}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.dateGroupHeader}>
                {group.dateLabel}
              </SproutText>
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
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    marginVertical: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCircle: {
    width: 40,
    height: 40,
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
  groupsContainer: {
    marginTop: spacing.sm,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateGroupHeader: {
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  itemsList: {
    gap: 4,
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
