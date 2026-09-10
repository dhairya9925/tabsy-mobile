import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { JournalStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  ScreenShell,
  Toast,
} from '../../components';
import { getCategoryIcon } from '../../components/ExpenseRow';
import { formatCurrencyExact, formatDate } from '../../utils/formatters';
import { expensesApi } from '../../api/expenses';
import { ArrowLeft, Edit3, Trash2, Calendar, FileText, Tag, User } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<JournalStackParamList, 'ExpenseDetail'>;

export const ExpenseDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [expense, setExpense] = useState(route.params.expense);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const categoryName = typeof expense.category === 'string'
    ? expense.category
    : (expense.category as any)?.name || 'Personal Expense';
  const displayDate = expense.date || expense.expense_date || '';

  const handleDelete = () => {
    Alert.alert(
      'Delete expense?',
      `This will permanently delete this ₹${Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} expense. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await expensesApi.deletePersonalExpense(expense.id);
              navigation.goBack();
            } catch (err: any) {
              setIsDeleting(false);
              setErrorMessage(err.message || 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    rootNavigation.navigate('EditExpenseModal', { expense });
  };

  return (
    <ScreenShell scrollable={false} contentContainerStyle={styles.container}>
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <SproutText variant="subtitle" color={colors.text} weight="700">
          Expense Details
        </SproutText>
        <CircleButton
          icon={<Edit3 size={18} color={colors.accent} />}
          onPress={handleEdit}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* Hero Amount Card */}
        <View style={styles.heroCard}>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.amountEyebrow}>
            TOTAL AMOUNT
          </SproutText>
          <SproutText variant="amount" color={colors.negative} style={styles.amountHero}>
            -{formatCurrencyExact(expense.amount)}
          </SproutText>

          <View style={styles.categoryBadge}>
            <View style={styles.badgeIcon}>{getCategoryIcon(categoryName)}</View>
            <SproutText variant="caption" color={colors.text} weight="700">
              {categoryName}
            </SproutText>
          </View>
        </View>

        {/* Detail Cards */}
        <View style={styles.detailsGroup}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <FileText size={18} color={colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <SproutText variant="caption" color={colors.muted} style={styles.detailLabel}>
                NOTE
              </SproutText>
              <SproutText variant="body" color={colors.text} weight="600">
                {expense.description || expense.note || 'No note added'}
              </SproutText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <Calendar size={18} color={colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <SproutText variant="caption" color={colors.muted} style={styles.detailLabel}>
                DATE
              </SproutText>
              <SproutText variant="body" color={colors.text} weight="600">
                {formatDate(displayDate)} ({displayDate})
              </SproutText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <User size={18} color={colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <SproutText variant="caption" color={colors.muted} style={styles.detailLabel}>
                TYPE
              </SproutText>
              <SproutText variant="body" color={colors.text} weight="600">
                Personal Expense
              </SproutText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomBar}>
        <SproutButton
          label="Edit Expense"
          variant="outline"
          onPress={handleEdit}
          style={styles.actionBtn}
        />
        <SproutButton
          label="Delete"
          variant="clay"
          isLoading={isDeleting}
          onPress={handleDelete}
          style={styles.actionBtn}
        />
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scrollBody: {
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  amountEyebrow: {
    marginBottom: 4,
  },
  amountHero: {
    marginVertical: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.soft,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  badgeIcon: {
    marginRight: 6,
  },
  detailsGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadows.card,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
  },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
