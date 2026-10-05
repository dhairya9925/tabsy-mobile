import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { CircleButton } from './CircleButton';
import { Category } from '../types';
import { getCategoryIcon } from './ExpenseRow';
import { X, Search, Check, Sparkles, Settings2, Plus } from 'lucide-react-native';

export interface CategoryPickerSheetProps {
  visible: boolean;
  categories: Category[];
  selectedCategoryName: string;
  onSelectCategory: (categoryName: string) => void;
  onClose: () => void;
  onManageCategories?: () => void;
}

export const CategoryPickerSheet: React.FC<CategoryPickerSheetProps> = ({
  visible,
  categories,
  selectedCategoryName,
  onSelectCategory,
  onClose,
  onManageCategories,
}) => {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize selected category for accurate comparison
  const selectedNorm = (selectedCategoryName || '').trim().toLowerCase();

  // Filtered categories based on search input
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // Frequent / Recommended top categories (top 4 or popular items)
  const frequentCategories = useMemo(() => {
    const popularNames = ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities'];
    const matched: Category[] = [];
    popularNames.forEach((pName) => {
      const found = categories.find((c) => c.name.toLowerCase() === pName.toLowerCase());
      if (found) matched.push(found);
    });
    if (matched.length < 4) {
      categories.forEach((c) => {
        if (!matched.some((m) => m.id === c.id) && matched.length < 4) {
          matched.push(c);
        }
      });
    }
    return matched;
  }, [categories]);

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderColor: colors.line,
            },
            shadows.modal,
          ]}
        >
          {/* Grab Handle */}
          <View
            style={[
              styles.handleBar,
              { backgroundColor: isDark ? colors.line : '#E2E8F0' },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <SproutText variant="eyebrow" color={colors.accent}>
                CATEGORY PICKER · {categories.length} {categories.length === 1 ? 'OPTION' : 'OPTIONS'}
              </SproutText>
              <SproutText variant="title" color={colors.text} weight="700">
                Select Category
              </SproutText>
            </View>
            <CircleButton
              icon={<X size={18} color={colors.text} />}
              onPress={handleClose}
              accessibilityLabel="Close category picker"
            />
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC',
                borderColor: colors.line,
              },
            ]}
          >
            <Search size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search 20+ categories..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
              >
                <X size={14} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Frequent / Quick-Picks strip (Shown when search is empty) */}
          {!searchQuery.trim() && frequentCategories.length > 0 && (
            <View style={styles.quickPicksContainer}>
              <SproutText
                variant="eyebrow"
                color={colors.muted}
                style={styles.quickPicksLabel}
              >
                FREQUENT PICKS
              </SproutText>
              <View style={styles.quickPicksRow}>
                {frequentCategories.map((cat) => {
                  const isSelected = selectedNorm === cat.name.trim().toLowerCase();
                  return (
                    <TouchableOpacity
                      key={`freq-${cat.id || cat.name}`}
                      activeOpacity={0.75}
                      onPress={() => handleSelect(cat.name)}
                      style={[
                        styles.quickPickChip,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : isDark
                            ? colors.surfaceElevated
                            : '#F1F5F9',
                          borderColor: isSelected ? colors.accent : colors.line,
                        },
                      ]}
                    >
                      {getCategoryIcon(
                        cat.name,
                        isSelected ? colors.onAccent : colors.muted,
                        13
                      )}
                      <SproutText
                        variant="caption"
                        color={isSelected ? colors.onAccent : colors.text}
                        weight={isSelected ? '700' : '600'}
                        style={styles.quickPickText}
                      >
                        {cat.name}
                      </SproutText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 2-Column Grid of Category Cards */}
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item.id || item.name}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Sparkles size={28} color={colors.muted} style={{ marginBottom: 8 }} />
                <SproutText variant="body" color={colors.text} weight="600" style={{ textAlign: 'center' }}>
                  No categories matching "{searchQuery}"
                </SproutText>
                <SproutText variant="caption" color={colors.muted} style={{ textAlign: 'center', marginTop: 4 }}>
                  You can use this query directly as a custom category
                </SproutText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelect(searchQuery.trim())}
                  style={[styles.useCustomButton, { backgroundColor: colors.accent }]}
                >
                  <Plus size={16} color={colors.onAccent} />
                  <SproutText variant="body" color={colors.onAccent} weight="700" style={{ marginLeft: 6 }}>
                    Use "{searchQuery.trim()}"
                  </SproutText>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selectedNorm === item.name.trim().toLowerCase();
              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleSelect(item.name)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected
                        ? colors.accentSoft
                        : isDark
                        ? colors.surfaceElevated
                        : '#FFFFFF',
                      borderColor: isSelected ? colors.accent : colors.line,
                    },
                    isSelected && styles.categoryCardSelected,
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : isDark
                            ? colors.surface
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      {getCategoryIcon(
                        item.name,
                        isSelected ? colors.onAccent : colors.accent,
                        18
                      )}
                    </View>

                    {isSelected ? (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                        <Check size={12} color={colors.onAccent} strokeWidth={3} />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.unselectedRadio,
                          { borderColor: isDark ? colors.line : '#CBD5E1' },
                        ]}
                      />
                    )}
                  </View>

                  <SproutText
                    variant="body"
                    color={colors.text}
                    weight={isSelected ? '700' : '600'}
                    numberOfLines={1}
                    style={styles.categoryName}
                  >
                    {item.name}
                  </SproutText>
                </TouchableOpacity>
              );
            }}
          />

          {/* Manage Categories Footer */}
          {onManageCategories && (
            <View style={[styles.footerContainer, { borderTopColor: colors.line }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  onManageCategories();
                }}
                style={styles.manageButton}
              >
                <Settings2 size={16} color={colors.accent} />
                <SproutText variant="body" color={colors.accent} weight="700" style={{ marginLeft: 8 }}>
                  Manage or Add Categories
                </SproutText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitles: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: spacing.xs,
  },
  quickPicksContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  quickPicksLabel: {
    marginBottom: 6,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  quickPicksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: 6,
  },
  quickPickText: {
    fontSize: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  categoryCard: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: 10,
    justifyContent: 'space-between',
    minHeight: 88,
  },
  categoryCardSelected: {
    borderWidth: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  categoryName: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  useCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  footerContainer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
