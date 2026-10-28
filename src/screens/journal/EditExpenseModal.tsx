import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, fontFamilies, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  CategoryPickerSheet,
  Toast,
} from '../../components';
import { getCategoryIcon } from '../../components/ExpenseRow';
import { expensesApi } from '../../api/expenses';
import { Category } from '../../types';
import { X, Trash2, MoreHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'EditExpenseModal'>;

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'bills', name: 'Bills & Utilities' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'health', name: 'Health' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'other', name: 'Other' },
];

const POPULAR_GRID_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'bills', name: 'Bills & Utilities' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'health', name: 'Health' },
];

export const EditExpenseModal: React.FC<Props> = ({ route, navigation }) => {
  const { expense } = route.params;
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.floor((windowWidth - spacing.lg * 2 - 24) / 4);

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

  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
              setIsDeleting(false);
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

  const isAutoPicked = useMemo(() => {
    if (!description.trim()) return false;
    const desc = description.toLowerCase();
    const cat = selectedCategoryName.toLowerCase();
    return desc.includes(cat) || cat.includes(desc);
  }, [description, selectedCategoryName]);

  const gridCategories = useMemo(() => {
    const selectedNorm = selectedCategoryName.trim().toLowerCase();
    const isSelectedInTop6 = POPULAR_GRID_CATEGORIES.some(
      (c) => c.name.trim().toLowerCase() === selectedNorm
    );

    const items = [...POPULAR_GRID_CATEGORIES];

    if (!isSelectedInTop6 && selectedCategoryName.trim()) {
      const found = categories.find((c) => c.name.trim().toLowerCase() === selectedNorm);
      items.push(found || { id: 'active_cat', name: selectedCategoryName });
    } else {
      const remaining = categories.filter((c) => {
        const norm = c.name.trim().toLowerCase();
        return (
          norm !== 'other' &&
          !POPULAR_GRID_CATEGORIES.some((p) => p.name.trim().toLowerCase() === norm)
        );
      });
      if (remaining.length > 0) {
        items.push(remaining[0]);
      } else {
        items.push({ id: 'other', name: 'Other' });
      }
    }

    return items.slice(0, 7);
  }, [categories, selectedCategoryName]);

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
            accessibilityLabel="Close"
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Edit Expense
          </SproutText>
          <CircleButton
            icon={<Trash2 size={18} color={colors.negative} />}
            onPress={handleDelete}
            disabled={isDeleting || isSubmitting}
            accessibilityLabel="Delete expense"
          />
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
            <View style={styles.sectionHeaderRow}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
                CATEGORY
              </SproutText>
              {isAutoPicked ? (
                <SproutText variant="caption" color={colors.muted} style={styles.autoPickedText}>
                  Auto-picked from your note
                </SproutText>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsCategorySheetOpen(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <SproutText variant="caption" color={colors.accent} weight="700">
                    {categories.length > 7 ? `All (${categories.length}) ▾` : 'Browse ▾'}
                  </SproutText>
                </TouchableOpacity>
              )}
            </View>

            {/* 4x2 Category Grid (8 Slots) */}
            <View style={styles.categoryGrid}>
              {gridCategories.map((cat) => {
                const isSelected =
                  selectedCategoryName.trim().toLowerCase() === cat.name.trim().toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.id || cat.name}
                    activeOpacity={0.75}
                    onPress={() => setSelectedCategoryName(cat.name)}
                    style={[
                      styles.categoryCard,
                      {
                        width: cardWidth,
                        backgroundColor: colors.surface,
                        borderColor: isSelected ? colors.accent : colors.line,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        isSelected && [
                          styles.iconWrapSelected,
                          { backgroundColor: colors.accentSoft },
                        ],
                      ]}
                    >
                      {getCategoryIcon(cat.name, colors.accent, isSelected ? 18 : 20)}
                    </View>
                    <SproutText
                      variant="caption"
                      color={isSelected ? colors.text : colors.muted}
                      weight={isSelected ? '700' : '600'}
                      numberOfLines={2}
                      style={styles.cardLabel}
                    >
                      {cat.name}
                    </SproutText>
                  </TouchableOpacity>
                );
              })}

              {/* 8th Slot: More Button */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setIsCategorySheetOpen(true)}
                style={[
                  styles.categoryCard,
                  {
                    width: cardWidth,
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.iconWrap}>
                  <MoreHorizontal size={20} color={colors.accent} strokeWidth={2} />
                </View>
                <SproutText
                  variant="caption"
                  color={colors.muted}
                  weight="600"
                  style={styles.cardLabel}
                >
                  More
                </SproutText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Details Form Fields */}
          <View style={styles.section}>
            {/* Note Field Card */}
            <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.fieldEyebrow}>
                NOTE (OPTIONAL)
              </SproutText>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="grocery"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Date Field Card */}
            <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.fieldEyebrow}>
                DATE
              </SproutText>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                value={dateStr}
                onChangeText={setDateStr}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Save Action */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
          <SproutButton
            label="Update Expense"
            isLoading={isSubmitting}
            disabled={isDeleting}
            onPress={handleUpdate}
          />
        </View>
      </KeyboardAvoidingView>

      <CategoryPickerSheet
        visible={isCategorySheetOpen}
        categories={categories}
        selectedCategoryName={selectedCategoryName}
        onSelectCategory={(catName) => setSelectedCategoryName(catName)}
        onClose={() => setIsCategorySheetOpen(false)}
        onManageCategories={() => navigation.navigate('CategoryManager')}
      />
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
    marginVertical: spacing.md,
  },
  amountEyebrow: {
    marginBottom: spacing.xs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 52,
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    marginBottom: 0,
  },
  autoPickedText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
  },
  categoryCard: {
    minHeight: 82,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    borderRadius: 17,
  },
  cardLabel: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  fieldCard: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  fieldEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: '700',
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: fontFamilies.medium,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});

