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
} from 'react-native';
import { colors, radii, spacing, shadows, fontFamilies } from '../theme';
import { SproutText } from './SproutText';
import { CircleButton } from './CircleButton';
import { Group } from '../types';
import { filterGroups } from '../utils/friendSearch';
import { getGroupTypeMeta } from '../utils/groupTypes';
import { X, Search, Check, Users } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface GroupPickerSheetProps {
  visible: boolean;
  groups: Group[];
  selectedGroupId: string;
  onSelectGroup: (group: Group) => void;
  onClose: () => void;
}

export const GroupPickerSheet: React.FC<GroupPickerSheetProps> = ({
  visible,
  groups,
  selectedGroupId,
  onSelectGroup,
  onClose,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = useMemo(() => {
    return filterGroups(groups, searchQuery);
  }, [groups, searchQuery]);

  const handleSelect = (group: Group) => {
    onSelectGroup(group);
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
            isDark && styles.sheetContainerDark,
            shadows.modal,
          ]}
        >
          {/* Grab Handle */}
          <View style={[styles.handleBar, isDark && styles.handleBarDark]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <SproutText variant="eyebrow" color={isDark ? colors.accent : '#355E47'}>
                SHARED GROUPS · {groups.length} {groups.length === 1 ? 'GROUP' : 'GROUPS'}
              </SproutText>
              <SproutText variant="title" color={isDark ? '#FFFFFF' : colors.text}>
                Select Group
              </SproutText>
            </View>
            <CircleButton
              icon={<X size={18} color={isDark ? '#FFFFFF' : colors.text} />}
              onPress={handleClose}
              accessibilityLabel="Close group picker"
            />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
            <Search size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isDark && styles.searchInputDark]}
              placeholder="Search groups by name..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
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

          {/* Group List */}
          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selectedGroupId === item.id;
              const typeMeta = getGroupTypeMeta(item.type);

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item)}
                  style={[
                    styles.groupRow,
                    isDark && styles.groupRowDark,
                    isSelected && (isDark ? styles.groupRowSelectedDark : styles.groupRowSelected),
                  ]}
                >
                  <View style={[styles.groupIconBox, isDark && styles.groupIconBoxDark]}>
                    <Users size={20} color={colors.accent} strokeWidth={2} />
                  </View>

                  <View style={styles.groupInfo}>
                    <SproutText
                      variant="subtitle"
                      color={isDark ? '#FFFFFF' : colors.text}
                      weight="700"
                      numberOfLines={1}
                    >
                      {item.name}
                    </SproutText>
                    <View style={styles.typeBadgeRow}>
                      <View style={styles.typeBadge}>
                        <SproutText variant="caption" color={colors.accent} weight="700" style={styles.typeBadgeText}>
                          {typeMeta.label}
                        </SproutText>
                      </View>
                      {item.description ? (
                        <SproutText
                          variant="caption"
                          color={colors.muted}
                          numberOfLines={1}
                          style={styles.groupDesc}
                        >
                          · {item.description}
                        </SproutText>
                      ) : null}
                    </View>
                  </View>

                  {isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Check size={14} color={colors.onAccent} strokeWidth={2.5} />
                    </View>
                  ) : (
                    <View style={[styles.unselectedIndicator, isDark && styles.unselectedIndicatorDark]} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {groups.length === 0 ? (
                  <>
                    <View style={styles.emptyIconCircle}>
                      <Users size={28} color={colors.muted} />
                    </View>
                    <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
                      No groups yet
                    </SproutText>
                    <SproutText variant="caption" color={colors.muted} style={styles.emptySubtitle}>
                      Create a group in the Shared tab to split group expenses.
                    </SproutText>
                  </>
                ) : (
                  <>
                    <View style={styles.emptyIconCircle}>
                      <Search size={26} color={colors.muted} />
                    </View>
                    <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
                      No groups found
                    </SproutText>
                    <SproutText variant="caption" color={colors.muted} style={styles.emptySubtitle}>
                      No groups matching "{searchQuery}".
                    </SproutText>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSearchQuery('')}
                      style={styles.clearFilterBtn}
                    >
                      <SproutText variant="caption" color={colors.accent} weight="700">
                        Clear Search
                      </SproutText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            }
          />
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24, 50, 40, 0.45)',
  },
  sheetContainer: {
    backgroundColor: '#F6F7ED',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    maxHeight: '82%',
    minHeight: '48%',
  },
  sheetContainerDark: {
    backgroundColor: '#15251D',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: '#C5D6C0',
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  handleBarDark: {
    backgroundColor: '#2D4436',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerTitles: {
    flex: 1,
    gap: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  searchContainerDark: {
    backgroundColor: '#1B3125',
    borderColor: '#264333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: colors.text,
    padding: 0,
  },
  searchInputDark: {
    color: '#FFFFFF',
  },
  clearSearchBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: 8,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EDE2',
  },
  groupRowDark: {
    backgroundColor: '#1B3125',
    borderColor: '#264333',
  },
  groupRowSelected: {
    borderColor: colors.accent,
    backgroundColor: '#EBF4E7',
  },
  groupRowSelectedDark: {
    borderColor: colors.accent,
    backgroundColor: '#213D2E',
  },
  groupIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5EFE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconBoxDark: {
    backgroundColor: '#234433',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 3,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: '#DDEBD8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
  },
  groupDesc: {
    fontSize: 11,
    marginLeft: 4,
    flexShrink: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D0DCD0',
  },
  unselectedIndicatorDark: {
    borderColor: '#375643',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F1E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    marginBottom: 4,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  clearFilterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    backgroundColor: '#E8F1E4',
  },
});
