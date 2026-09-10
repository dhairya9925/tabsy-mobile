import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { JournalStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  FieldRow,
  ScreenShell,
  Toast,
} from '../../components';
import { getCategoryIcon } from '../../components/ExpenseRow';
import { categoriesApi } from '../../api/categories';
import { Category } from '../../types';
import { ArrowLeft, Plus, Trash2, Tag, Layers } from 'lucide-react-native';

type Props = NativeStackScreenProps<JournalStackParamList, 'CategoryManager'>;

export const CategoryManagerScreen: React.FC<Props> = ({ navigation }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoriesApi.getCategories();
      setCategories(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      setErrorMessage('Please enter a category name');
      return;
    }
    if (newCategoryName.trim().length < 2) {
      setErrorMessage('Category name must be at least 2 characters');
      return;
    }

    setIsCreating(true);
    setErrorMessage('');
    try {
      await categoriesApi.createCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      setSuccessMessage('Category created successfully!');
      await loadCategories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Delete category?',
      `Are you sure you want to delete "${category.name}"? Existing expenses will preserve their history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoriesApi.deleteCategory(category.id);
              setSuccessMessage(`Deleted "${category.name}"`);
              await loadCategories();
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenShell
      isRefreshing={isLoading}
      onRefresh={loadCategories}
      contentContainerStyle={styles.container}
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

      {/* Top Bar */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <SproutText variant="subtitle" color={colors.text} weight="700">
          Categories
        </SproutText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent}>
          CATEGORIES
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Manage Categories
        </SproutText>
        <SproutText variant="bodyMuted">
          Create custom categories to organize your expenses.
        </SproutText>
      </View>

      {/* Add New Category Box */}
      <View style={styles.addCard}>
        <SproutText variant="caption" color={colors.muted} weight="700" style={styles.addLabel}>
          ADD CATEGORY
        </SproutText>
        <View style={styles.addRow}>
          <FieldRow
            placeholder="Category name..."
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            icon={<Tag size={18} color={colors.muted} />}
            style={styles.addInput}
          />
          <SproutButton
            label="Add"
            isLoading={isCreating}
            onPress={handleCreate}
            style={styles.addBtn}
          />
        </View>
      </View>

      {/* Categories List */}
      <View style={styles.listSection}>
        <SproutText variant="eyebrow" color={colors.muted} style={styles.listEyebrow}>
          YOUR CATEGORIES ({categories.length})
        </SproutText>

        {categories.length === 0 && !isLoading ? (
          <View style={styles.emptyCard}>
            <Layers size={36} color={colors.muted} strokeWidth={1.5} />
            <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
              No custom categories yet
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Add your first custom category above.
            </SproutText>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.catItem}>
                <View style={styles.catIconCircle}>{getCategoryIcon(cat.name)}</View>
                <View style={styles.catInfo}>
                  <SproutText variant="subtitle" color={colors.text} weight="700">
                    {cat.name}
                  </SproutText>
                  {cat.slug && (
                    <SproutText variant="caption" color={colors.muted}>
                      #{cat.slug}
                    </SproutText>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDelete(cat)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={18} color={colors.negative} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    marginVertical: 4,
    fontSize: 26,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  addLabel: {
    marginBottom: spacing.xs,
  },
  addRow: {
    gap: spacing.sm,
  },
  addInput: {
    marginBottom: 0,
  },
  addBtn: {
    height: 46,
    marginTop: -8,
  },
  listSection: {
    marginTop: spacing.sm,
  },
  listEyebrow: {
    marginBottom: spacing.sm,
  },
  categoryList: {
    gap: spacing.sm,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadows.card,
  },
  catIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  catInfo: {
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    marginBottom: 4,
  },
});
