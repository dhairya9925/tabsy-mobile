import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, fontFamilies, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  CategoryChip,
  FieldRow,
  Toast,
} from '../../components';
import { expensesApi } from '../../api/expenses';
import { Category } from '../../types';
import { X, FileText, Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'EditExpenseModal'>;

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'bills', name: 'Bills & Utilities' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'other', name: 'Other' },
];

export const EditExpenseModal: React.FC<Props> = ({ route, navigation }) => {
  const { expense } = route.params;
  const { colors } = useTheme();

  const [amountStr, setAmountStr] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description || expense.note || '');
  const [dateStr, setDateStr] = useState(expense.date || expense.expense_date || '');

  const initialCategoryName = typeof expense.category === 'string'
    ? expense.category
    : (expense.category as any)?.name || 'Food & Dining';

  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(initialCategoryName);

  const [categories, setCategories] = useState<Category[]>(() => {
    const list = [...DEFAULT_CATEGORIES];
    const exists = list.some(
      (c) => c.name.toLowerCase() === initialCategoryName.toLowerCase()
    );
    if (!exists && initialCategoryName && initialCategoryName.toLowerCase() !== 'general') {
      list.splice(list.length - 1, 0, {
        id: initialCategoryName.toLowerCase().replace(/\s+/g, '_'),
        name: initialCategoryName,
      });
    }
    return list;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    expensesApi.getCategories()
      .then((customCats) => {
        if (Array.isArray(customCats) && customCats.length > 0) {
          setCategories((prev) => {
            const map = new Map<string, Category>();
            // Add defaults first
            DEFAULT_CATEGORIES.forEach((c) => map.set(c.name.toLowerCase(), c));
            // Add custom categories from server
            customCats.forEach((c) => {
              if (c.name && !map.has(c.name.toLowerCase())) {
                map.set(c.name.toLowerCase(), {
                  id: c.id || c.name.toLowerCase().replace(/\s+/g, '_'),
                  name: c.name,
                });
              }
            });
            // Ensure expense's category is present
            if (initialCategoryName && initialCategoryName.toLowerCase() !== 'general' && !map.has(initialCategoryName.toLowerCase())) {
              map.set(initialCategoryName.toLowerCase(), {
                id: initialCategoryName.toLowerCase().replace(/\s+/g, '_'),
                name: initialCategoryName,
              });
            }
            const combined = Array.from(map.values());
            // Keep 'Other' at the end
            const otherIdx = combined.findIndex((c) => c.name.toLowerCase() === 'other');
            if (otherIdx > -1 && otherIdx < combined.length - 1) {
              const [other] = combined.splice(otherIdx, 1);
              combined.push(other);
            }
            return combined;
          });
        }
      })
      .catch(() => {});
  }, [initialCategoryName]);

  const handleUpdate = async () => {
    setErrorMessage('');
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await expensesApi.updatePersonalExpense(expense.id, {
        amount: parsedAmount,
        category: selectedCategoryName,
        note: description.trim() || undefined,
        expense_date: dateStr,
      });

      setSuccessMessage('Expense updated successfully');
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <Toast
          visible={!!errorMessage}
          message={errorMessage}
          type="error"
          onDismiss={() => setErrorMessage('')}
        />
        <Toast
          visible={!!successMessage}
          message={successMessage}
          type="success"
          onDismiss={() => setSuccessMessage('')}
        />

        {/* Top Header */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={() => navigation.goBack()}
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Edit Expense
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.amountEyebrow}>
              AMOUNT
            </SproutText>
            <View style={styles.amountInputRow}>
              <SproutText variant="amount" color={colors.accent} style={[styles.currencyPrefix, { color: colors.accent }]}>
                ₹
              </SproutText>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.muted}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
          </View>

          {/* Categories Selector */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              CATEGORY
            </SproutText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  isSelected={selectedCategoryName.trim().toLowerCase() === cat.name.trim().toLowerCase()}
                  onSelect={() => setSelectedCategoryName(cat.name)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Details Form Fields */}
          <View style={styles.section}>
            <FieldRow
              label="Note (Optional)"
              placeholder="Dinner, cab..."
              value={description}
              onChangeText={setDescription}
              icon={<FileText size={18} color={colors.muted} />}
            />

            <FieldRow
              label="Date"
              placeholder="YYYY-MM-DD"
              value={dateStr}
              onChangeText={setDateStr}
              icon={<Calendar size={18} color={colors.muted} />}
            />
          </View>
        </ScrollView>

        {/* Bottom Save Action */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
          <SproutButton
            label="Update Expense"
            isLoading={isSubmitting}
            onPress={handleUpdate}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 24,
  },
  amountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  amountEyebrow: {
    marginBottom: spacing.xs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 48,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    paddingVertical: 6,
    paddingRight: spacing.sm,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});

