import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  SegmentControl,
  CategoryChip,
  FieldRow,
  Toast,
} from '../../components';
import { expensesApi } from '../../api/expenses';
import { Category } from '../../types';
import { toLocalDateString } from '../../utils/formatters';
import { X, MoreHorizontal, FileText, Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const AddExpenseModal: React.FC = () => {
  const navigation = useNavigation();

  const [mode, setMode] = useState<'personal' | 'friend' | 'group'>('personal');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Default categories matching frontend/src/lib/categories.ts
  const defaultCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining' },
    { id: 'cat-transport', name: 'Transport' },
    { id: 'cat-shop', name: 'Shopping' },
    { id: 'cat-bills', name: 'Bills & Utilities' },
    { id: 'cat-other', name: 'Other' },
  ];

  useEffect(() => {
    expensesApi.getCategories()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setSelectedCategoryId(data[0].id);
        } else {
          setCategories(defaultCategories);
          setSelectedCategoryId(defaultCategories[0].id);
        }
      })
      .catch(() => {
        setCategories(defaultCategories);
        setSelectedCategoryId(defaultCategories[0].id);
      });
  }, []);

  const handleSave = async () => {
    setErrorMessage('');
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'personal') {
        const selectedCat = categories.find((c) => c.id === selectedCategoryId);
        const catName = selectedCat?.name || 'Other';

        await expensesApi.createPersonalExpense({
          amount: parsedAmount,
          category: catName,
          note: description.trim() || undefined,
          expense_date: dateStr,
        });

        setSuccessMessage('Expense added successfully');
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } else {
        setErrorMessage(`${mode === 'friend' ? '1-on-1' : 'Group'} expense flow is scheduled for Phase 3/4.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeOptions = [
    { value: 'personal' as const, label: 'Personal' },
    { value: 'friend' as const, label: '1-on-1' },
    { value: 'group' as const, label: 'Group' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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

        {/* Top Header Bar */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={() => navigation.goBack()}
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Add Expense
          </SproutText>
          <CircleButton
            icon={<MoreHorizontal size={20} color={colors.text} />}
            onPress={() => {}}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Display with Currency Symbol */}
          <View style={styles.amountContainer}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.amountEyebrow}>
              AMOUNT
            </SproutText>
            <View style={styles.amountInputRow}>
              <SproutText variant="amount" color={colors.accent} style={styles.currencyPrefix}>
                ₹
              </SproutText>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.line}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                autoFocus
                maxLength={9}
              />
            </View>
          </View>

          {/* Mode Switcher */}
          <SegmentControl
            options={modeOptions}
            value={mode}
            onChange={(val) => setMode(val)}
          />

          {mode !== 'personal' && (
            <View style={styles.infoBanner}>
              <SproutText variant="caption" color={colors.text} weight="600">
                Shared {mode === 'friend' ? '1-on-1' : 'group'} mode active. Choose who split and who paid.
              </SproutText>
            </View>
          )}

          {/* Categories Horizontal Carousel */}
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
                  isSelected={selectedCategoryId === cat.id}
                  onSelect={(id) => setSelectedCategoryId(id)}
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
        <View style={styles.bottomBar}>
          <SproutButton
            label="Save Expense"
            isLoading={isSubmitting}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.accent,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: 'JetBrainsMono',
    fontWeight: '700',
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  infoBanner: {
    backgroundColor: colors.soft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    paddingVertical: 4,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
