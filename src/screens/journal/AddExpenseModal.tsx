import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  Toast,
} from '../../components';
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
  icon: (color: string) => React.ReactNode;
}

const DEFAULT_SPROUT_CATEGORIES: SproutCategoryItem[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    shortLabel: 'Food',
    icon: (c) => <Utensils size={20} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'transport',
    name: 'Transport',
    shortLabel: 'Travel',
    icon: (c) => <Car size={20} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    shortLabel: 'Shop',
    icon: (c) => <ShoppingBag size={20} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    shortLabel: 'Bills',
    icon: (c) => <ReceiptText size={20} color={c} strokeWidth={1.8} />,
  },
  {
    id: 'other',
    name: 'Other',
    shortLabel: 'Other',
    icon: (c) => <MoreHorizontal size={20} color={c} strokeWidth={1.8} />,
  },
];

export const AddExpenseModal: React.FC = () => {
  const navigation = useNavigation();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);

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
  const [paidBy, setPaidBy] = useState<'me' | 'them'>('me');
  const [splitType, setSplitType] = useState<'equal' | 'full'>('equal');

  // Group mode state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
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
        const otherId = first.user_id === currentUser?.id ? first.friend_id : first.user_id;
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
      const currId = currentUser?.id || currentUser?.user_id || '';
      const isMember = mList.some((m) => m.user_id === currId);
      if (isMember) {
        setGroupPaidByUserId(currId);
      } else if (mList.length > 0) {
        setGroupPaidByUserId(mList[0].user_id);
      }
    }).catch(() => {});
  }, [selectedGroupId, currentUser]);

  const handleSelectFriend = (f: FriendRecord) => {
    const otherId = f.user_id === currentUser?.id ? f.friend_id : f.user_id;
    const name = f.profile?.display_name || f.profile?.email || 'Friend';
    setSelectedFriendId(otherId);
    setSelectedFriendName(name);
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
  const hasDecimal = amountStr.includes('.');

  const handleSave = async () => {
    setErrorMessage('');
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = DEFAULT_SPROUT_CATEGORIES.find((c) => c.id === selectedCategoryId);
      const catName = selectedCat?.name || 'Other';

      if (mode === 'personal') {
        await expensesApi.createPersonalExpense({
          amount: numericAmount,
          category: catName,
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

        const payerId = paidBy === 'me'
          ? (currentUser?.id || currentUser?.user_id || '')
          : selectedFriendId;

        await friendsApi.createFriendExpense(selectedFriendId, {
          amount: numericAmount,
          category: catName,
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
          category: catName,
          note: description.trim() || undefined,
          expense_date: dateStr,
          paid_by: groupPaidByUserId || (currentUser?.id || currentUser?.user_id),
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
            onPress={() => navigation.goBack()}
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
            onPress={() => navigation.goBack()}
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
          <View style={styles.sproutAmountCard}>
            <SproutText variant="caption" color={colors.muted} style={styles.howMuchLabel}>
              How much?
            </SproutText>
            <View style={styles.amountDisplayRow}>
              <SproutText variant="amount" color={colors.text} style={styles.currencySymbol}>
                ₹
              </SproutText>
              <TextInput
                style={styles.amountNumberInput}
                value={amountStr}
                onChangeText={handleAmountChange}
                placeholder="480"
                placeholderTextColor={colors.line}
                keyboardType="decimal-pad"
                maxLength={8}
                autoFocus
              />
              <SproutText variant="subtitle" color={colors.muted} style={styles.amountDecimal}>
                {hasDecimal ? '' : '.00'}
              </SproutText>
            </View>
          </View>

          {/* Mode Switcher Capsule matching Sprout Screen 02 */}
          <View style={styles.modeContainer}>
            {(['personal', 'friend', 'group'] as const).map((tab) => {
              const isSelected = mode === tab;
              const label = tab === 'personal' ? 'Personal' : tab === 'friend' ? 'Friend' : 'Group';
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.85}
                  onPress={() => setMode(tab)}
                  style={[styles.modeTab, isSelected && styles.modeTabSelected]}
                >
                  <SproutText
                    variant="caption"
                    color={isSelected ? colors.accent : colors.muted}
                    weight={isSelected ? '800' : '600'}
                    style={styles.modeText}
                  >
                    {label}
                  </SproutText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Friend Mode Specific Section */}
          {mode === 'friend' && (
            <View style={styles.subSectionCard}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.subSectionTitle}>
                WITH A FRIEND
              </SproutText>
              {friends.length === 0 ? (
                <View style={styles.emptyCard}>
                  <SproutText variant="caption" color={colors.muted}>
                    No friends yet. Add a friend in Shared to start splitting.
                  </SproutText>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                  {friends.map((f) => {
                    const fid = f.user_id === currentUser?.id ? f.friend_id : f.user_id;
                    const isSelected = selectedFriendId === fid;
                    const name = f.profile?.display_name || f.profile?.email || 'Friend';
                    const initials = getInitials(name);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        activeOpacity={0.8}
                        onPress={() => handleSelectFriend(f)}
                        style={[styles.friendChip, isSelected && styles.friendChipSelected]}
                      >
                        <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                          <SproutText variant="caption" color={isSelected ? colors.onAccent : colors.accent} weight="700">
                            {initials}
                          </SproutText>
                        </View>
                        <SproutText
                          variant="caption"
                          color={isSelected ? colors.onAccent : colors.text}
                          weight={isSelected ? '700' : '600'}
                        >
                          {name}
                        </SproutText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Who Paid */}
              <View style={styles.pillToggleGroup}>
                <SproutText variant="eyebrow" color={colors.muted} style={styles.pillGroupLabel}>
                  WHO PAID?
                </SproutText>
                <View style={styles.pillToggleRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPaidBy('me')}
                    style={[styles.togglePill, paidBy === 'me' && styles.togglePillSelected]}
                  >
                    <SproutText
                      variant="caption"
                      color={paidBy === 'me' ? colors.accent : colors.muted}
                      weight={paidBy === 'me' ? '800' : '600'}
                    >
                      You paid
                    </SproutText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPaidBy('them')}
                    style={[styles.togglePill, paidBy === 'them' && styles.togglePillSelected]}
                  >
                    <SproutText
                      variant="caption"
                      color={paidBy === 'them' ? colors.accent : colors.muted}
                      weight={paidBy === 'them' ? '800' : '600'}
                      numberOfLines={1}
                    >
                      {selectedFriendName || 'Friend'} paid
                    </SproutText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* How to split */}
              <View style={styles.pillToggleGroup}>
                <SproutText variant="eyebrow" color={colors.muted} style={styles.pillGroupLabel}>
                  SPLIT
                </SproutText>
                <View style={styles.pillToggleRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSplitType('equal')}
                    style={[styles.togglePill, splitType === 'equal' && styles.togglePillSelected]}
                  >
                    <SproutText
                      variant="caption"
                      color={splitType === 'equal' ? colors.accent : colors.muted}
                      weight={splitType === 'equal' ? '800' : '600'}
                    >
                      Split equally (50/50)
                    </SproutText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSplitType('full')}
                    style={[styles.togglePill, splitType === 'full' && styles.togglePillSelected]}
                  >
                    <SproutText
                      variant="caption"
                      color={splitType === 'full' ? colors.accent : colors.muted}
                      weight={splitType === 'full' ? '800' : '600'}
                    >
                      {paidBy === 'me' ? 'They owe full' : 'You owe full'}
                    </SproutText>
                  </TouchableOpacity>
                </View>

                {/* Calculation breakdown badge */}
                {numericAmount > 0 && (
                  <View style={[styles.breakdownPill, paidBy === 'me' ? styles.breakdownPillPositive : styles.breakdownPillNeutral]}>
                    <SproutText
                      variant="caption"
                      color={paidBy === 'me' ? '#25603A' : '#7D4734'}
                      weight="700"
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
              </View>
            </View>
          )}

          {/* Group Mode Specific Section */}
          {mode === 'group' && (
            <View style={styles.subSectionCard}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.subSectionTitle}>
                SELECT GROUP
              </SproutText>
              {groups.length === 0 ? (
                <View style={styles.emptyCard}>
                  <SproutText variant="caption" color={colors.muted}>
                    No groups found. Create a group in Shared tab to record group expenses.
                  </SproutText>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                  {groups.map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedGroupId(g.id)}
                        style={[styles.groupChip, isSelected && styles.groupChipSelected]}
                      >
                        <Users size={14} color={isSelected ? colors.onAccent : colors.accent} style={{ marginRight: 6 }} />
                        <SproutText
                          variant="caption"
                          color={isSelected ? colors.onAccent : colors.text}
                          weight={isSelected ? '700' : '600'}
                        >
                          {g.name}
                        </SproutText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Paid By */}
              {groupMembers.length > 0 && (
                <View style={styles.pillToggleGroup}>
                  <SproutText variant="eyebrow" color={colors.muted} style={styles.pillGroupLabel}>
                    PAID BY
                  </SproutText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                    {groupMembers.map((m) => {
                      const isSelected = groupPaidByUserId === m.user_id;
                      const isYou = m.user_id === (currentUser?.id || currentUser?.user_id);
                      const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                      return (
                        <TouchableOpacity
                          key={m.user_id}
                          activeOpacity={0.8}
                          onPress={() => setGroupPaidByUserId(m.user_id)}
                          style={[styles.payerChip, isSelected && styles.payerChipSelected]}
                        >
                          <UserCheck size={13} color={isSelected ? colors.onAccent : colors.accent} style={{ marginRight: 4 }} />
                          <SproutText
                            variant="caption"
                            color={isSelected ? colors.onAccent : colors.text}
                            weight={isSelected ? '700' : '600'}
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
                <View style={[styles.breakdownPill, styles.breakdownPillPositive]}>
                  <SproutText variant="caption" color="#25603A" weight="700">
                    {numericAmount > 0
                      ? `Equal split · ₹${(numericAmount / groupMembers.length).toFixed(2)} each across ${groupMembers.length} members`
                      : `Split equally among all ${groupMembers.length} members`}
                  </SproutText>
                </View>
              )}
            </View>
          )}

          {/* Category Grid matching Sprout Screen 02 */}
          <View style={styles.categoryGrid}>
            {DEFAULT_SPROUT_CATEGORIES.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.categoryBtn,
                    isSelected && styles.categoryBtnSelected,
                  ]}
                >
                  {cat.icon(isSelected ? colors.onAccent : colors.muted)}
                  <SproutText
                    variant="caption"
                    color={isSelected ? colors.onAccent : colors.muted}
                    weight={isSelected ? '700' : '600'}
                    style={styles.categoryLabel}
                  >
                    {cat.shortLabel}
                  </SproutText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Details Fields matching Sprout Screen 02 */}
          <View style={styles.fieldsContainer}>
            {/* Note Field */}
            <View style={styles.sproutFieldRow}>
              <FileText size={18} color={colors.muted} strokeWidth={1.8} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Lunch & coffee"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
              />
              <SproutText variant="caption" color={colors.muted} style={styles.fieldTag}>
                Note
              </SproutText>
            </View>

            {/* Date Field */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={styles.sproutFieldRow}
            >
              <CalendarDays size={18} color={colors.muted} strokeWidth={1.8} style={styles.fieldIcon} />
              <SproutText variant="body" color={colors.text} style={styles.fieldValue}>
                {formatFriendlyDate(dateStr)}
              </SproutText>
              <SproutText variant="caption" color={colors.accent} weight="700" style={styles.fieldActionTag}>
                Change
              </SproutText>
            </TouchableOpacity>

            {/* Quick Date Selector Chips (toggleable) */}
            {showDatePicker && (
              <View style={styles.datePickerChips}>
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
                      style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                    >
                      <SproutText
                        variant="caption"
                        color={isSelected ? colors.onAccent : colors.text}
                        weight="700"
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
                <Check size={16} color={colors.accent} strokeWidth={2.4} />
                <SproutText variant="caption" color={colors.muted} style={styles.affirmationText}>
                  This keeps your logging rhythm going.
                </SproutText>
              </>
            ) : mode === 'friend' ? (
              <>
                <CheckCheck size={16} color={colors.accent} strokeWidth={2.4} />
                <SproutText variant="caption" color={colors.muted} style={styles.affirmationText}>
                  Clear between friends · Both ledgers update immediately.
                </SproutText>
              </>
            ) : (
              <>
                <CheckCheck size={16} color={colors.accent} strokeWidth={2.4} />
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
  sproutAmountCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.xs,
    ...shadows.card,
  },
  howMuchLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    marginTop: 8,
    marginRight: 2,
  },
  amountNumberInput: {
    fontSize: 52,
    fontFamily: fontFamilies.bold,
    letterSpacing: -2,
    color: colors.text,
    textAlign: 'center',
    minWidth: 70,
    padding: 0,
    margin: 0,
  },
  amountDecimal: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    marginTop: 10,
    marginLeft: 1,
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
  subSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 10,
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
  },
  horizontalChips: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  friendChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarCircleSelected: {
    backgroundColor: '#305C43',
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  groupChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  payerChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  emptyCard: {
    padding: spacing.sm,
  },
  pillToggleGroup: {
    marginTop: spacing.md,
  },
  pillGroupLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  pillToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#DFE9DC',
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  togglePillSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  breakdownPill: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownPillPositive: {
    backgroundColor: '#D8E8CB',
  },
  breakdownPillNeutral: {
    backgroundColor: '#F4DACD',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 7,
    marginVertical: 4,
  },
  categoryBtn: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryBtnSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryLabel: {
    fontSize: 10,
  },
  fieldsContainer: {
    marginTop: 8,
  },
  sproutFieldRow: {
    height: 49,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: colors.text,
    padding: 0,
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },
  fieldTag: {
    fontSize: 11,
  },
  fieldActionTag: {
    fontSize: 11,
  },
  datePickerChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 8,
    paddingLeft: 4,
  },
  dateChip: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dateChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  affirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
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
