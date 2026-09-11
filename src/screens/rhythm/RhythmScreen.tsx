import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing } from '../../theme';
import {
  SproutText,
  ScreenShell,
  AvatarCircle,
  StreakRow,
  MonthlyPaceCard,
  BalancePillsRow,
  ExpenseRow,
  Toast,
  CardSkeleton,
  ExpenseListSkeleton,
  EmptyState,
} from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { expensesApi } from '../../api/expenses';
import { DashboardSummary, PersonalExpense } from '../../types';
import { getCurrentWeekDays, formatMonthYear } from '../../utils/formatters';
import { PlusCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const RhythmScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [streakDates, setStreakDates] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<PersonalExpense[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [dates, dashSummary, expenses] = await Promise.all([
        expensesApi.getStreakActivityDates(),
        expensesApi.getDashboardSummary().catch(() => null),
        expensesApi.getPersonalExpenses().catch(() => []),
      ]);

      setStreakDates(dates);
      if (dashSummary) setSummary(dashSummary);
      setRecentExpenses(Array.isArray(expenses) ? expenses.slice(0, 5) : []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync with backend');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAvatarPress = () => {
    navigation.navigate('Profile');
  };

  const weekDays = getCurrentWeekDays(streakDates);
  const totalSpent = summary?.monthly_spent ?? recentExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const toReceive = summary?.to_receive ?? 0;
  const toPay = summary?.to_pay ?? 0;

  const displayName = user?.display_name || (user?.email ? user.email.split('@')[0] : '');

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            {`${currentMonth} RHYTHM`}
          </SproutText>
          <SproutText variant="hero" style={styles.heroText}>
            Keep it clear,{'\n'}day by day.
          </SproutText>
        </View>

        <View style={styles.headerRight}>
          <AvatarCircle
            name={user?.display_name}
            email={user?.email}
            avatarUrl={user?.avatar_url}
            onPress={handleAvatarPress}
          />
        </View>
      </View>

      {/* 7-Day Activity Streak Row */}
      <StreakRow days={weekDays} />

      {isLoading && !summary ? (
        <>
          <CardSkeleton />
          <View style={styles.sectionHeader}>
            <SproutText variant="title" color={colors.text} style={styles.sectionTitle}>
              This week
            </SproutText>
          </View>
          <ExpenseListSkeleton count={3} />
        </>
      ) : (
        <>
          {/* Monthly Spend vs Budget Card */}
          <MonthlyPaceCard
            spent={totalSpent}
            budget={monthlyBudget}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Insight' })}
          />

          {/* Balance Summary Row (You're Owed / You Owe) */}
          <BalancePillsRow
            toReceive={toReceive}
            toPay={toPay}
          />

          {/* This Week / Recent Activity Section */}
          <View style={styles.sectionHeader}>
            <SproutText variant="title" color={colors.text} style={styles.sectionTitle}>
              This week
            </SproutText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                (navigation as any).navigate('Main', {
                  screen: 'Journal',
                  params: { screen: 'JournalList' },
                })
              }
            >
              <SproutText variant="caption" color={colors.accent} weight="700">
                See month
              </SproutText>
            </TouchableOpacity>
          </View>

          {recentExpenses.length === 0 ? (
            <EmptyState
              card
              icon={<PlusCircle size={32} color={colors.accent} strokeWidth={1.75} />}
              title="No recent activity recorded"
              subtitle="Add your first expense to start your daily logging rhythm."
              actionLabel="+ Quick Add"
              onActionPress={() => navigation.navigate('AddExpenseModal')}
            />
          ) : (
            <View style={styles.expensesList}>
              {recentExpenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onPress={() =>
                    (navigation as any).navigate('Main', {
                      screen: 'Journal',
                      params: { screen: 'ExpenseDetail', params: { expense } },
                    })
                  }
                />
              ))}
            </View>
          )}
        </>
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
  },
  heroText: {
    marginTop: 4,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -1.4,
    color: colors.text,
  },
  headerRight: {
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.text,
  },
  expensesList: {
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptyDesc: {
    textAlign: 'center',
  },
});
