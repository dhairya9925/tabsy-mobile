import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../theme';
import { SproutText, ScreenShell, ExpenseRow } from '../../components';
import { expensesApi } from '../../api/expenses';
import { PersonalExpense } from '../../types';
import { ReceiptText } from 'lucide-react-native';

export const JournalScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await expensesApi.getPersonalExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  return (
    <ScreenShell
      isRefreshing={isLoading}
      onRefresh={loadExpenses}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent}>
          PERSONAL LEDGER
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Journal
        </SproutText>
        <SproutText variant="bodyMuted">
          A complete timeline of all your personal expenses.
        </SproutText>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <ReceiptText size={40} color={colors.muted} strokeWidth={1.5} />
          <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
            No entries in Journal yet
          </SproutText>
          <SproutText variant="caption" color={colors.muted}>
            Expenses you add will appear here in chronological order.
          </SproutText>
        </View>
      ) : (
        <View style={styles.list}>
          {expenses.map((expense) => (
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
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    marginVertical: 4,
  },
  list: {
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
    marginTop: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
});
