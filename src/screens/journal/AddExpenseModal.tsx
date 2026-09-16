import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  SproutAmountInput,
  SegmentControl,
  Toast,
  AvatarCircle,
  FriendPickerSheet,
  GroupPickerSheet,
} from '../../components';
import { useTransitionAutoFocus } from '../../hooks';
import { expensesApi } from '../../api/expenses';
import { friendsApi } from '../../api/friends';
import { groupsApi } from '../../api/groups';
import { useAuthStore } from '../../store/useAuthStore';
import { Category, FriendRecord, Group, GroupMember } from '../../types';
import { toLocalDateString, formatCurrencyExact, getInitials } from '../../utils/formatters';
import { splitEqual } from '../../utils/money';
import { RootStackParamList } from '../../navigation/types';
import {
  ArrowLeft,
  X,
  FileText,
  CalendarDays,
  Utensils,
  Car,
  ShoppingBag,
  ReceiptText,
  MoreHorizontal,
  Check,
  CheckCheck,
  Users,
  UserCheck,
  Search,
  User,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function getEntryEyebrow(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr.split('T')[0] + 'T12:00:00') : new Date();
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return `${days[d.getDay()]}'S ENTRY`;
  }
  if (isYesterday) {
    return "YESTERDAY'S ENTRY";
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() + ' ENTRY';
}

export function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr.split('T')[0] + 'T12:00:00');
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const formatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  if (isToday) return `Today, ${formatted}`;
  if (isYesterday) return `Yesterday, ${formatted}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface SproutCategoryItem {
  id: string;
  name: string;
  shortLabel: string;
  icon: (color: string, size?: number) => React.ReactNode;
}

const DEFAULT_SPROUT_CATEGORIES: SproutCategoryItem[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    shortLabel: 'Food',
    icon: (c, s = 14) => <Utensils size={s} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'transport',
    name: 'Transport',
    shortLabel: 'Travel',
    icon: (c, s = 14) => <Car size={s} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    shortLabel: 'Shop',
    icon: (c, s = 14) => <ShoppingBag size={s} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    shortLabel: 'Bills',
    icon: (c, s = 14) => <ReceiptText size={s} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'other',
    name: 'Other',
    shortLabel: 'Other',
    icon: (c, s = 14) => <MoreHorizontal size={s} color={c} strokeWidth={1.8} />,
  },
];

export const AddExpenseModal: React.FC = () => {
  const navigation = useNavigation();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);

  const amountInputRef = useTransitionAutoFocus();

  const handleDismiss = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const [mode, setMode] = useState<'personal' | 'friend' | 'group'>('personal');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('food');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Friend mode state
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [paidBy, setPaidBy] = useState<'me' | 'them'>('me');
  const [splitType, setSplitType] = useState<'equal' | 'full'>('equal');

  // Group mode state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupPaidByUserId, setGroupPaidByUserId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initial data loading
  useEffect(() => {
    // Load friends
    friendsApi.getFriends().then((fList) => {
      setFriends(fList);
      if (fList.length > 0 && !selectedFriendId) {
        const first = fList[0];
        const myUserId = currentUser?.user_id || currentUser?.id;
        const otherId = first.profile?.user_id || (first.user_id === myUserId ? first.friend_id : first.user_id);
        setSelectedFriendId(otherId);
        setSelectedFriendName(first.profile?.display_name || first.profile?.email || 'Friend');
      }
    }).catch(() => {});

    // Load groups
    groupsApi.getGroups().then((gList) => {
      setGroups(gList);
      if (gList.length > 0 && !selectedGroupId) {
        setSelectedGroupId(gList[0].id);
      }
    }).catch(() => {});
  }, [currentUser]);

  // When group changes, fetch its members
  useEffect(() => {
    if (!selectedGroupId) return;
    groupsApi.getGroupMembers(selectedGroupId).then((mList) => {
      setGroupMembers(mList);
      const currId = currentUser?.user_id || currentUser?.id || '';
      const isMember = mList.some((m) => m.user_id === currId);
      if (isMember) {
        setGroupPaidByUserId(currId);
      } else if (mList.length > 0) {
        setGroupPaidByUserId(mList[0].user_id);
      }
    }).catch(() => {});
  }, [selectedGroupId, currentUser]);

  const myUserId = currentUser?.user_id || currentUser?.id;

  const selectedFriend = friends.find((f) => {
    const fid = f.profile?.user_id || (f.user_id === myUserId ? f.friend_id : f.user_id);
    return fid === selectedFriendId;
  }) || null;

  const selectedFriendNameComputed = selectedFriend?.profile?.display_name || selectedFriend?.profile?.email || selectedFriendName || 'Friend';
  const selectedFriendEmail = selectedFriend?.profile?.email || null;
  const selectedFriendAvatarUrl = selectedFriend?.profile?.avatar_url || null;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  const handleSelectFriend = (f: FriendRecord) => {
    const otherId = f.profile?.user_id || (f.user_id === myUserId ? f.friend_id : f.user_id);
    const name = f.profile?.display_name || f.profile?.email || 'Friend';
    setSelectedFriendId(otherId);
    setSelectedFriendName(name);
  };

  const handleSelectGroup = (g: Group) => {
    setSelectedGroupId(g.id);
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one optional decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmountStr(cleaned);
  };

  const numericAmount = parseFloat(amountStr) || 0;

  const handleSave = async () => {
    setErrorMessage('');
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      const selectedCat = DEFAULT_SPROUT_CATEGORIES.find((c) => c.id === selectedCategoryId);
      const catSlug = selectedCat?.id || 'other';

      if (mode === 'personal') {
        await expensesApi.createPersonalExpense({
          amount: numericAmount,
          category: catSlug,
          note: description.trim() || undefined,
          expense_date: dateStr,
        });
        setSuccessMessage('Entry saved to journal');
        setTimeout(() => navigation.goBack(), 450);
      } else if (mode === 'friend') {
        if (!selectedFriendId) {
          setErrorMessage('Please select a friend to split with');
          setIsSubmitting(false);
          return;
        }

        const myUserId = currentUser?.user_id || currentUser?.id || '';
        const payerId = paidBy === 'me'
          ? myUserId
          : selectedFriendId;

        await friendsApi.createFriendExpense(selectedFriendId, {
          amount: numericAmount,
          category: catSlug,
          note: description.trim() || undefined,
          expense_date: dateStr,
          paid_by: payerId,
          split_type: splitType,
        });
        setSuccessMessage('1-on-1 expense recorded');
        setTimeout(() => navigation.goBack(), 450);
      } else if (mode === 'group') {
        if (!selectedGroupId) {
          setErrorMessage('Please select a group');
          setIsSubmitting(false);
          return;
        }
        if (groupMembers.length === 0) {
          setErrorMessage('The selected group has no members');
          setIsSubmitting(false);
          return;
        }

        const shares = splitEqual(numericAmount, groupMembers.length);
        const splits = groupMembers.map((m, idx) => ({
          user_id: m.user_id,
          amount: shares[idx] || 0,
        }));

        await groupsApi.createGroupExpense(selectedGroupId, {
          amount: numericAmount,
          category: catSlug,
          note: description.trim() || undefined,
          expense_date: dateStr,
          paid_by: groupPaidByUserId || (currentUser?.user_id || currentUser?.id),
          splits,
        });
        setSuccessMessage('Group expense recorded');
        setTimeout(() => navigation.goBack(), 450);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Header matching Sprout Screen 02 */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDismiss}
            style={styles.headerCircleBtn}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.headerEyebrow}>
              {getEntryEyebrow(dateStr)}
            </SproutText>
            <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
              Add to journal
            </SproutText>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDismiss}
            style={styles.headerCircleBtn}
            accessibilityLabel="Close"
          >
            <X size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Card matching Sprout Screen 02 */}
          <SproutAmountInput
            ref={amountInputRef}
            value={amountStr}
            onChangeText={handleAmountChange}
            placeholder="480"
            label="How much?"
            testID="journal-expense-amount-input"
          />

          {/* Mode Switcher Capsule matching Sprout Screen 02 */}
          <SegmentControl<'personal' | 'friend' | 'group'>
            size="sm"
            options={[
              { value: 'personal', label: 'Personal' },
              { value: 'friend', label: 'Friend' },
              { value: 'group', label: 'Group' },
            ]}
            value={mode}
            onChange={setMode}
            style={{ marginVertical: 6 }}
          />

          {/* Friend Mode Specific Section */}
          {mode === 'friend' && (
            <View style={styles.compactSubSectionCard}>
              {friends.length === 0 ? (
                <View style={styles.emptyCard}>
                  <SproutText variant="caption" color={colors.muted}>
                    No friends yet. Add a friend in Shared to start splitting.
                  </SproutText>
                </View>
              ) : (
                <>
                  {/* Top Row: Selected Friend (Tap to open full searchable sheet) & Quick Switchers */}
                  <View style={styles.compactHeaderRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setShowFriendPicker(true)}
                      style={styles.compactEntityMain}
                    >
                      <AvatarCircle
                        name={selectedFriendNameComputed}
                        email={selectedFriendEmail}
                        avatarUrl={selectedFriendAvatarUrl}
                        size={26}
                      />
                      <View style={styles.compactEntityInfo}>
                        <SproutText variant="caption" color={colors.muted} style={styles.compactMicroEyebrow}>
                          SPLIT WITH
                        </SproutText>
                        <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1} style={styles.compactEntityName}>
                          {selectedFriendNameComputed} ▾
                        </SproutText>
                      </View>
                    </TouchableOpacity>

                    {/* Quick Friends Avatars (top 3 friends for 1-tap switching) */}
                    {friends.length > 1 && (
                      <View style={styles.compactQuickRow}>
                        {friends.slice(0, 3).map((f) => {
                          const fid = f.profile?.user_id || (f.user_id === myUserId ? f.friend_id : f.user_id);
                          const isSelected = selectedFriendId === fid;
                          const name = f.profile?.display_name || f.profile?.email || 'Friend';
                          return (
                            <TouchableOpacity
                              key={f.id}
                              activeOpacity={0.7}
                              onPress={() => handleSelectFriend(f)}
                              style={[styles.compactQuickAvatarTouch, isSelected && styles.compactQuickAvatarTouchSelected]}
                            >
                              <AvatarCircle
                                name={name}
                                avatarUrl={f.profile?.avatar_url}
                                size={22}
                              />
                            </TouchableOpacity>
                          );
                        })}
                        {friends.length > 3 && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setShowFriendPicker(true)}
                            style={styles.compactQuickMoreBadge}
                          >
                            <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 10 }}>
                              +{friends.length - 3}
                            </SproutText>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Row 2: Who Paid & Split in 2 side-by-side columns */}
                  <View style={styles.compactControlsRow}>
                    <View style={{ flex: 1, marginRight: 5 }}>
                      <SproutText variant="caption" color={colors.muted} style={styles.compactControlLabel}>
                        WHO PAID
                      </SproutText>
                      <SegmentControl<'me' | 'them'>
                        size="sm"
                        options={[
                          { value: 'me', label: 'You' },
                          { value: 'them', label: selectedFriendName ? selectedFriendName.split(' ')[0] : 'Them' },
                        ]}
                        value={paidBy}
                        onChange={setPaidBy}
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 5 }}>
                      <SproutText variant="caption" color={colors.muted} style={styles.compactControlLabel}>
                        SPLIT
                      </SproutText>
                      <SegmentControl<'equal' | 'full'>
                        size="sm"
                        options={[
                          { value: 'equal', label: '50/50' },
                          { value: 'full', label: paidBy === 'me' ? 'They full' : 'You full' },
                        ]}
                        value={splitType}
                        onChange={setSplitType}
                      />
                    </View>
                  </View>

                  {/* Calculation breakdown badge */}
                  {numericAmount > 0 && (
                    <View style={[styles.compactBreakdownPill, paidBy === 'me' ? styles.breakdownPillPositive : styles.breakdownPillNeutral]}>
                      <SproutText
                        variant="caption"
                        color={paidBy === 'me' ? '#25603A' : '#7D4734'}
                        weight="700"
                        style={{ fontSize: 11 }}
                      >
                        {paidBy === 'me'
                          ? splitType === 'equal'
                            ? `₹${(numericAmount / 2).toFixed(2)} coming back to you`
                            : `₹${numericAmount.toFixed(2)} coming back to you`
                          : splitType === 'equal'
                            ? `₹${(numericAmount / 2).toFixed(2)} you owe ${selectedFriendName || 'Friend'}`
                            : `₹${numericAmount.toFixed(2)} you owe ${selectedFriendName || 'Friend'}`}
                      </SproutText>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Group Mode Specific Section */}
          {mode === 'group' && (
            <View style={styles.compactSubSectionCard}>
              {groups.length === 0 ? (
                <View style={styles.emptyCard}>
                  <SproutText variant="caption" color={colors.muted}>
                    No groups found. Create a group in Shared tab to record group expenses.
                  </SproutText>
                </View>
              ) : (
                <>
                  {/* Top Row: Active Group pill & Quick Group Switchers */}
                  <View style={styles.compactHeaderRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setShowGroupPicker(true)}
                      style={styles.compactEntityMain}
                    >
                      <View style={styles.compactGroupIconWrap}>
                        <Users size={16} color={colors.accent} />
                      </View>
                      <View style={styles.compactEntityInfo}>
                        <SproutText variant="caption" color={colors.muted} style={styles.compactMicroEyebrow}>
                          ACTIVE GROUP
                        </SproutText>
                        <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1} style={styles.compactEntityName}>
                          {selectedGroup?.name || 'Select group'} ▾
                        </SproutText>
                      </View>
                    </TouchableOpacity>

                    {/* Quick Groups Pills */}
                    {groups.length > 1 && (
                      <View style={styles.compactQuickRow}>
                        {groups.slice(0, 3).map((g) => {
                          const isSelected = selectedGroupId === g.id;
                          return (
                            <TouchableOpacity
                              key={g.id}
                              activeOpacity={0.7}
                              onPress={() => handleSelectGroup(g)}
                              style={[styles.compactQuickGroupPill, isSelected && styles.compactQuickGroupPillSelected]}
                            >
                              <SproutText
                                variant="caption"
                                color={isSelected ? colors.onAccent : colors.text}
                                weight={isSelected ? '700' : '600'}
                                numberOfLines={1}
                                style={{ fontSize: 11 }}
                              >
                                {g.name}
                              </SproutText>
                            </TouchableOpacity>
                          );
                        })}
                        {groups.length > 3 && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setShowGroupPicker(true)}
                            style={styles.compactQuickMoreBadge}
                          >
                            <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 10 }}>
                              +{groups.length - 3}
                            </SproutText>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Paid By Row */}
                  {groupMembers.length > 0 && (
                    <View style={styles.compactGroupPaidByRow}>
                      <SproutText variant="caption" color={colors.muted} style={styles.compactControlLabel}>
                        PAID BY:
                      </SproutText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {groupMembers.map((m) => {
                          const isSelected = groupPaidByUserId === m.user_id;
                          const isYou = m.user_id === (currentUser?.user_id || currentUser?.id);
                          const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                          return (
                            <TouchableOpacity
                              key={m.user_id}
                              activeOpacity={0.8}
                              onPress={() => setGroupPaidByUserId(m.user_id)}
                              style={[styles.compactPayerPill, isSelected && styles.compactPayerPillSelected]}
                            >
                              <SproutText
                                variant="caption"
                                color={isSelected ? colors.onAccent : colors.text}
                                weight={isSelected ? '700' : '600'}
                                style={{ fontSize: 11 }}
                              >
                                {name}
                              </SproutText>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Split Summary */}
                  {groupMembers.length > 0 && (
                    <View style={[styles.compactBreakdownPill, styles.breakdownPillPositive]}>
                      <SproutText variant="caption" color="#25603A" weight="700" style={{ fontSize: 11 }}>
                        {numericAmount > 0
                          ? `Equal split · ₹${(numericAmount / groupMembers.length).toFixed(2)} each across ${groupMembers.length} members`
                          : `Split equally among all ${groupMembers.length} members`}
                      </SproutText>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Category Strip (Compact Horizontal Pills) */}
          <View style={styles.compactCategoryRow}>
            {DEFAULT_SPROUT_CATEGORIES.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.compactCategoryPill,
                    isSelected && styles.compactCategoryPillSelected,
                  ]}
                >
                  {cat.icon(isSelected ? colors.onAccent : colors.muted, 13)}
                  <SproutText
                    variant="caption"
                    color={isSelected ? colors.onAccent : colors.muted}
                    weight={isSelected ? '700' : '600'}
                    style={styles.compactCategoryLabel}
                  >
                    {cat.shortLabel}
                  </SproutText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Details Fields: Compact 2-in-1 Note & Date Card */}
          <View style={styles.compactFieldsCard}>
            {/* Note Field */}
            <View style={styles.compactFieldRow}>
              <FileText size={15} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.compactFieldInput}
                placeholder="Lunch & coffee note"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
              />
              <SproutText variant="caption" color={colors.muted} style={{ fontSize: 10 }}>
                Note
              </SproutText>
            </View>

            <View style={styles.compactFieldDivider} />

            {/* Date Field */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={styles.compactFieldRow}
            >
              <CalendarDays size={15} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 8 }} />
              <SproutText variant="caption" color={colors.text} weight="700" style={{ flex: 1, fontSize: 12 }}>
                {formatFriendlyDate(dateStr)}
              </SproutText>
              <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                {showDatePicker ? 'Done' : 'Change'}
              </SproutText>
            </TouchableOpacity>

            {/* Quick Date Selector Chips (toggleable) */}
            {showDatePicker && (
              <View style={styles.compactDatePickerChips}>
                {[
                  { label: 'Today', date: toLocalDateString(new Date()) },
                  {
                    label: 'Yesterday',
                    date: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      return toLocalDateString(d);
                    })(),
                  },
                ].map((item) => {
                  const isSelected = dateStr === item.date;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => {
                        setDateStr(item.date);
                        setShowDatePicker(false);
                      }}
                      style={[styles.compactDateChip, isSelected && styles.dateChipSelected]}
                    >
                      <SproutText
                        variant="caption"
                        color={isSelected ? colors.onAccent : colors.text}
                        weight="700"
                        style={{ fontSize: 11 }}
                      >
                        {item.label}
                      </SproutText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Affirmation Note matching Sprout Screen 02 */}
          <View style={styles.affirmationRow}>
            {mode === 'personal' ? (
              <>
                <Check size={14} color={colors.accent} strokeWidth={2.4} />
                <SproutText variant="caption" color={colors.muted} style={styles.affirmationText}>
                  This keeps your logging rhythm going.
                </SproutText>
              </>
            ) : mode === 'friend' ? (
              <>
                <CheckCheck size={14} color={colors.accent} strokeWidth={2.4} />
                <SproutText variant="caption" color={colors.muted} style={styles.affirmationText}>
                  Clear between friends · Both ledgers update immediately.
                </SproutText>
              </>
            ) : (
              <>
                <CheckCheck size={14} color={colors.accent} strokeWidth={2.4} />
                <SproutText variant="caption" color={colors.muted} style={styles.affirmationText}>
                  Shared rhythm · All shares added to group ledger.
                </SproutText>
              </>
            )}
          </View>
        </ScrollView>

        {/* Bottom CTA Button matching Sprout Screen 02 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={isSubmitting}
            style={styles.saveCtaBtn}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <>
                <Check size={19} color={colors.onAccent} strokeWidth={2.4} />
                <SproutText variant="subtitle" color={colors.onAccent} weight="700" style={styles.saveCtaText}>
                  {mode === 'personal' ? 'Save expense' : mode === 'friend' ? 'Record shared expense' : 'Save group expense'}
                </SproutText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Searchable Bottom Sheet Modals for 100+ Friends / Groups */}
      <FriendPickerSheet
        visible={showFriendPicker}
        friends={friends}
        selectedFriendId={selectedFriendId}
        currentUserId={myUserId}
        onSelectFriend={handleSelectFriend}
        onClose={() => setShowFriendPicker(false)}
      />
      <GroupPickerSheet
        visible={showGroupPicker}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        onClose={() => setShowGroupPicker(false)}
      />
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: fontFamilies.bold,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: fontFamilies.bold,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#DFE9DC',
    borderRadius: 999,
    padding: 4,
    marginVertical: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeText: {
    fontSize: 13,
  },
  compactSubSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 6,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactEntityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactGroupIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DFE9DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEntityInfo: {
    marginLeft: 7,
    flex: 1,
  },
  compactMicroEyebrow: {
    fontSize: 9,
    letterSpacing: 0.5,
    lineHeight: 11,
  },
  compactEntityName: {
    fontSize: 13,
    lineHeight: 16,
  },
  compactQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactQuickAvatarTouch: {
    borderRadius: radii.full,
    padding: 1,
  },
  compactQuickAvatarTouchSelected: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  compactQuickGroupPill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E5EDE2',
  },
  compactQuickGroupPillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  compactQuickMoreBadge: {
    backgroundColor: '#DFE9DC',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: radii.full,
  },
  compactControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactControlLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  compactBreakdownPill: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownPillPositive: {
    backgroundColor: '#D8E8CB',
  },
  breakdownPillNeutral: {
    backgroundColor: '#F4DACD',
  },
  compactGroupPaidByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  compactPayerPill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E5EDE2',
  },
  compactPayerPillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  compactCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginVertical: 4,
  },
  compactCategoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
    paddingHorizontal: 2,
  },
  compactCategoryPillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  compactCategoryLabel: {
    fontSize: 11,
  },
  compactFieldsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  compactFieldRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactFieldInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: colors.text,
    padding: 0,
  },
  compactFieldDivider: {
    height: 1,
    backgroundColor: colors.line,
    opacity: 0.6,
  },
  compactDatePickerChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  compactDateChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dateChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  emptyCard: {
    padding: spacing.sm,
  },
  affirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginVertical: 4,
  },
  affirmationText: {
    fontSize: 11,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  saveCtaBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,
  },
  saveCtaText: {
    fontSize: 15,
  },
});
