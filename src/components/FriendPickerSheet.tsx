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
import { AvatarCircle } from './AvatarCircle';
import { FriendRecord } from '../types';
import { filterFriends } from '../utils/friendSearch';
import { X, Search, Check, Users } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface FriendPickerSheetProps {
  visible: boolean;
  friends: FriendRecord[];
  selectedFriendId: string;
  currentUserId?: string;
  onSelectFriend: (friend: FriendRecord) => void;
  onClose: () => void;
}

export const FriendPickerSheet: React.FC<FriendPickerSheetProps> = ({
  visible,
  friends,
  selectedFriendId,
  currentUserId,
  onSelectFriend,
  onClose,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = useMemo(() => {
    return filterFriends(friends, searchQuery);
  }, [friends, searchQuery]);

  const handleSelect = (friend: FriendRecord) => {
    onSelectFriend(friend);
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
                DIRECTORY · {friends.length} {friends.length === 1 ? 'FRIEND' : 'FRIENDS'}
              </SproutText>
              <SproutText variant="title" color={isDark ? '#FFFFFF' : colors.text}>
                Select Friend
              </SproutText>
            </View>
            <CircleButton
              icon={<X size={18} color={isDark ? '#FFFFFF' : colors.text} />}
              onPress={handleClose}
              accessibilityLabel="Close friend picker"
            />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
            <Search size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isDark && styles.searchInputDark]}
              placeholder="Search friends by name or email..."
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

          {/* Friend List */}
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const myUserId = currentUserId;
              const fid = item.profile?.user_id || (item.user_id === myUserId ? item.friend_id : item.user_id);
              const isSelected = selectedFriendId === fid;
              const name = item.profile?.display_name || item.profile?.email || 'Friend';
              const email = item.profile?.email;

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item)}
                  style={[
                    styles.friendRow,
                    isDark && styles.friendRowDark,
                    isSelected && (isDark ? styles.friendRowSelectedDark : styles.friendRowSelected),
                  ]}
                >
                  <AvatarCircle
                    name={name}
                    email={email}
                    avatarUrl={item.profile?.avatar_url}
                    size={42}
                  />

                  <View style={styles.friendInfo}>
                    <SproutText
                      variant="subtitle"
                      color={isDark ? '#FFFFFF' : colors.text}
                      weight="700"
                      numberOfLines={1}
                    >
                      {name}
                    </SproutText>
                    {email ? (
                      <SproutText
                        variant="caption"
                        color={colors.muted}
                        numberOfLines={1}
                        style={styles.friendEmail}
                      >
                        {email}
                      </SproutText>
                    ) : null}
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
                {friends.length === 0 ? (
                  <>
                    <View style={styles.emptyIconCircle}>
                      <Users size={28} color={colors.muted} />
                    </View>
                    <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
                      No friends yet
                    </SproutText>
                    <SproutText variant="caption" color={colors.muted} style={styles.emptySubtitle}>
                      Add friends in the Shared tab to split expenses with them.
                    </SproutText>
                  </>
                ) : (
                  <>
                    <View style={styles.emptyIconCircle}>
                      <Search size={26} color={colors.muted} />
                    </View>
                    <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
                      No friends found
                    </SproutText>
                    <SproutText variant="caption" color={colors.muted} style={styles.emptySubtitle}>
                      No friends matching "{searchQuery}".
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
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EDE2',
  },
  friendRowDark: {
    backgroundColor: '#1B3125',
    borderColor: '#264333',
  },
  friendRowSelected: {
    borderColor: colors.accent,
    backgroundColor: '#EBF4E7',
  },
  friendRowSelectedDark: {
    borderColor: colors.accent,
    backgroundColor: '#213D2E',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  friendEmail: {
    fontSize: 12,
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
