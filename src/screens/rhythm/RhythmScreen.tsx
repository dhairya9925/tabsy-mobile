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
          <SproutText variant="eyebrow" color={colors.accent}>
            OVERVIEW
          </SproutText>
          <SproutText variant="hero" style={styles.heroText}>
            Welcome{displayName ? `, ${displayName}` : ''}
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

      {/* Monthly Spend vs Budget Card */}
      <MonthlyPaceCard
        spent={totalSpent}
        budget={monthlyBudget}
      />

      {/* Balance Summary Row (You're Owed / You Owe) */}
      <BalancePillsRow
        toReceive={toReceive}
        toPay={toPay}
      />

      {/* Recent Activity Section */}
      <View style={styles.sectionHeader}>
        <SproutText variant="title" color={colors.text}>
          Recent Activity
        </SproutText>
        <TouchableOpacity onPress={() => navigation.navigate('AddExpenseModal')}>
          <SproutText variant="caption" color={colors.accent} weight="700">
            + Quick Add
          </SproutText>
        </TouchableOpacity>
      </View>

      {recentExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <PlusCircle size={36} color={colors.muted} strokeWidth={1.5} />
          <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
            No recent activity recorded
          </SproutText>
          <SproutText variant="caption" color={colors.muted} style={styles.emptyDesc}>
            Add your first expense to start tracking.
          </SproutText>
        </View>
      ) : (
        <View style={styles.expensesList}>
          {recentExpenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} />
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
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  heroText: {
    marginTop: 4,
    fontSize: 26,
    lineHeight: 30,
  },
  headerRight: {
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  expensesList: {
    gap: 4,
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
