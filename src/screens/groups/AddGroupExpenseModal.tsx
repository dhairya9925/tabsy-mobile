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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  SproutAmountInput,
  SegmentControl,
  Toast,
  GroupPickerSheet,
} from '../../components';
import { useTransitionAutoFocus } from '../../hooks';
import { groupsApi } from '../../api/groups';
import { useAuthStore } from '../../store/useAuthStore';
import { Group, GroupMember } from '../../types';
import { toLocalDateString, formatCurrencyExact, getInitials } from '../../utils/formatters';
import { splitEqual } from '../../utils/money';
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
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEntryEyebrow, formatFriendlyDate } from '../journal/AddExpenseModal';

type Props = NativeStackScreenProps<RootStackParamList, 'AddGroupExpenseModal'>;

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
    icon: (c) => <Utensils size={14} color={c} strokeWidth={2} />,
  },
  {
    id: 'transport',
    name: 'Transport',
    shortLabel: 'Travel',
    icon: (c) => <Car size={14} color={c} strokeWidth={2} />,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    shortLabel: 'Shop',
    icon: (c) => <ShoppingBag size={14} color={c} strokeWidth={2} />,
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    shortLabel: 'Bills',
    icon: (c) => <ReceiptText size={14} color={c} strokeWidth={2} />,
  },
  {
    id: 'other',
    name: 'Other',
    shortLabel: 'Other',
    icon: (c) => <MoreHorizontal size={14} color={c} strokeWidth={2} />,
  },
];

export const AddGroupExpenseModal: React.FC<Props> = ({ route, navigation }) => {
  const initialGroupId = route.params?.groupId;
  const currentUser = useAuthStore((s) => s.user);

  const amountInputRef = useTransitionAutoFocus();

  const handleDismiss = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || '');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [paidByUserId, setPaidByUserId] = useState<string>(currentUser?.user_id || currentUser?.id || '');

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('food');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load groups
  useEffect(() => {
    groupsApi.getGroups()
      .then((gList) => {
        setGroups(gList);
        if (!selectedGroupId && gList.length > 0) {
          setSelectedGroupId(gList[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // When selectedGroupId changes, fetch members
  useEffect(() => {
    if (!selectedGroupId) return;
    groupsApi.getGroupMembers(selectedGroupId)
      .then((mList) => {
        setMembers(mList);
        // Default to all selected for equal split
        const allIds = new Set(mList.map((m) => m.user_id));
        setSelectedMemberIds(allIds);

        // Ensure paidByUserId is in the group, otherwise default to first member or current user
        const currId = currentUser?.user_id || currentUser?.id || '';
        const isMember = mList.some((m) => m.user_id === currId);
        if (isMember) {
          setPaidByUserId(currId);
        } else if (mList.length > 0) {
          setPaidByUserId(mList[0].user_id);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to load group members');
      });
  }, [selectedGroupId, currentUser]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;
  const handleSelectGroup = (g: Group) => setSelectedGroupId(g.id);

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (next.size > 1) {
          next.delete(userId);
        }
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCustomAmountChange = (userId: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setCustomAmounts((prev) => ({ ...prev, [userId]: cleaned }));
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmountStr(cleaned);
  };

  const numericAmount = parseFloat(amountStr) || 0;

  const equalShares = numericAmount > 0 && selectedMemberIds.size > 0
    ? splitEqual(numericAmount, selectedMemberIds.size)
    : [];

  const handleSave = async () => {
    setErrorMessage('');
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0');
      return;
    }
    if (!selectedGroupId) {
      setErrorMessage('Please select a group');
      return;
    }
    if (selectedMemberIds.size === 0) {
      setErrorMessage('At least one member must be selected to split');
      return;
    }

    let finalSplits: { user_id: string; amount: number }[] = [];

    if (splitMethod === 'equal') {
      const activeMembers = members.filter((m) => selectedMemberIds.has(m.user_id));
      const shares = splitEqual(numericAmount, activeMembers.length);
      finalSplits = activeMembers.map((m, idx) => ({
        user_id: m.user_id,
        amount: shares[idx] || 0,
      }));
    } else {
      let customSum = 0;
      finalSplits = members.map((m) => {
        const val = parseFloat(customAmounts[m.user_id] || '0') || 0;
        customSum += val;
        return {
          user_id: m.user_id,
          amount: val,
        };
      });

      if (Math.abs(customSum - numericAmount) > 0.05) {
        setErrorMessage(
          `Custom split total (${formatCurrencyExact(customSum)}) must match expense amount (${formatCurrencyExact(numericAmount)})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      const selectedCat = DEFAULT_SPROUT_CATEGORIES.find((c) => c.id === selectedCategoryId);
      const catSlug = selectedCat?.id || 'other';

      await groupsApi.createGroupExpense(selectedGroupId, {
        amount: numericAmount,
        category: catSlug,
        note: description.trim() || undefined,
        expense_date: dateStr,
        paid_by: paidByUserId || (currentUser?.user_id || currentUser?.id),
        splits: finalSplits,
      });

      setSuccessMessage('Group expense saved');
      setTimeout(() => navigation.goBack(), 450);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save group expense');
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

        {/* Header */}
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
              Add group expense
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
          {/* Amount Card */}
          <SproutAmountInput
            ref={amountInputRef}
            value={amountStr}
            onChangeText={handleAmountChange}
            placeholder="480"
            label="How much?"
            testID="group-expense-amount-input"
            style={{ marginBottom: 6 }}
          />

          {/* High-density Group & Paid By Card */}
          <View style={styles.compactEntityCard}>
            {groups.length > 1 && (
              <View style={styles.compactEntityHeaderRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowGroupPicker(true)}
                  style={styles.compactEntityMain}
                >
                  <View style={styles.compactGroupIconWrap}>
                    <Users size={14} color={colors.accent} />
                  </View>
                  <View style={styles.compactEntityInfo}>
                    <SproutText variant="caption" color={colors.text} weight="700" numberOfLines={1} style={styles.compactEntityName}>
                      {selectedGroup?.name || 'Select group'} ▾
                    </SproutText>
                  </View>
                </TouchableOpacity>

                <View style={styles.compactQuickRow}>
                  {groups.slice(0, 3).map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelectGroup(g)}
                        style={[
                          styles.compactQuickGroupPill,
                          isSelected && styles.compactQuickGroupPillSelected,
                        ]}
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
              </View>
            )}

            {/* Paid By & Split Method */}
            <View style={styles.compactControlsRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <SproutText variant="eyebrow" color={colors.muted} style={styles.compactControlLabel}>
                  PAID BY
                </SproutText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactGroupPaidByRow}>
                  {members.map((m) => {
                    const isSelected = paidByUserId === m.user_id;
                    const isYou = m.user_id === (currentUser?.user_id || currentUser?.id);
                    const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                    return (
                      <TouchableOpacity
                        key={m.user_id}
                        activeOpacity={0.8}
                        onPress={() => setPaidByUserId(m.user_id)}
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

              <View style={{ flex: 1, marginLeft: 6 }}>
                <SproutText variant="eyebrow" color={colors.muted} style={styles.compactControlLabel}>
                  SPLIT
                </SproutText>
                <SegmentControl<'equal' | 'custom'>
                  size="sm"
                  options={[
                    { value: 'equal', label: 'Equally' },
                    { value: 'custom', label: 'Exact' },
                  ]}
                  value={splitMethod}
                  onChange={setSplitMethod}
                />
              </View>
            </View>

            {/* Live equal breakdown summary */}
            {splitMethod === 'equal' && selectedMemberIds.size > 0 && (
              <View style={[styles.compactBreakdownPill, styles.breakdownPillPositive]}>
                <SproutText variant="caption" color="#25603A" weight="700" style={{ fontSize: 11, textAlign: 'center' }}>
                  {numericAmount > 0
                    ? `₹${(numericAmount / selectedMemberIds.size).toFixed(2)} each across ${selectedMemberIds.size} members`
                    : `Split equally among ${selectedMemberIds.size} members`}
                </SproutText>
              </View>
            )}

            {/* Members inclusion list (equal split) */}
            {splitMethod === 'equal' && members.length > 2 && (
              <View style={styles.compactMembersList}>
                {members.map((m) => {
                  const isIncluded = selectedMemberIds.has(m.user_id);
                  const isYou = m.user_id === (currentUser?.user_id || currentUser?.id);
                  const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                  return (
                    <TouchableOpacity
                      key={m.user_id}
                      activeOpacity={0.8}
                      onPress={() => toggleMemberSelection(m.user_id)}
                      style={[styles.compactMemberRow, isIncluded && styles.memberRowIncluded]}
                    >
                      <View style={[styles.compactCheckCircle, isIncluded && styles.checkCircleActive]}>
                        {isIncluded && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                      <SproutText variant="caption" color={colors.text} style={{ flex: 1, fontSize: 12 }}>
                        {name}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted} weight="600" style={{ fontSize: 11 }}>
                        {isIncluded && numericAmount > 0
                          ? `₹${(numericAmount / selectedMemberIds.size).toFixed(2)}`
                          : 'Excluded'}
                      </SproutText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Custom amounts input list */}
            {splitMethod === 'custom' && (
              <View style={styles.compactMembersList}>
                {members.map((m) => {
                  const isYou = m.user_id === (currentUser?.user_id || currentUser?.id);
                  const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                  return (
                    <View key={m.user_id} style={styles.compactCustomMemberRow}>
                      <SproutText variant="caption" color={colors.text} style={{ flex: 1, fontSize: 12 }}>
                        {name}
                      </SproutText>
                      <View style={styles.compactCustomInputBox}>
                        <SproutText variant="caption" color={colors.muted} style={{ marginRight: 2, fontSize: 11 }}>
                          ₹
                        </SproutText>
                        <TextInput
                          style={styles.compactCustomTextInput}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={colors.line}
                          value={customAmounts[m.user_id] || ''}
                          onChangeText={(val) => handleCustomAmountChange(m.user_id, val)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Category Pill Strip */}
          <View style={styles.compactCategoryRow}>
            {DEFAULT_SPROUT_CATEGORIES.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.compactCategoryPill,
                    isSelected && styles.compactCategoryPillSelected,
                  ]}
                >
                  {cat.icon(isSelected ? colors.onAccent : colors.muted)}
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

          {/* Details Fields: Single unified 2-in-1 card */}
          <View style={styles.compactFieldsCard}>
            {/* Note Field */}
            <View style={styles.compactFieldRow}>
              <FileText size={16} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.compactFieldInput}
                placeholder="Dinner at Social"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
              />
              <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
                Note
              </SproutText>
            </View>

            <View style={styles.compactFieldDivider} />

            {/* Date Field */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={styles.compactFieldRow}
            >
              <CalendarDays size={16} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 8 }} />
              <SproutText variant="body" color={colors.text} style={{ flex: 1, fontSize: 12, fontFamily: fontFamilies.bold }}>
                {formatFriendlyDate(dateStr)}
              </SproutText>
              <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                Change
              </SproutText>
            </TouchableOpacity>
          </View>

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
                    style={[styles.compactDateChip, isSelected && styles.compactDateChipSelected]}
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

          {/* Affirmation Note */}
          <View style={styles.affirmationRow}>
            <CheckCheck size={14} color={colors.accent} strokeWidth={2.4} />
            <SproutText variant="caption" color={colors.muted} style={styles.affirmationText}>
              Shared rhythm · All shares added to group ledger.
            </SproutText>
          </View>
        </ScrollView>

        {/* Bottom CTA Button */}
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
                  Save group expense
                </SproutText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
    paddingHorizontal: spacing.xl,
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  subSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 10,
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
  },
  compactEntityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5EDE2',
    marginBottom: 6,
  },
  compactEntityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
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
  compactEntityName: {
    fontSize: 13,
    lineHeight: 16,
  },
  compactQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  compactGroupPaidByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
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
  compactMembersList: {
    marginTop: 6,
    gap: 4,
  },
  compactMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  memberRowIncluded: {
    backgroundColor: '#F3F8F1',
  },
  compactCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  checkCircleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  compactCustomMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  compactCustomInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 80,
  },
  compactCustomTextInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontFamily: fontFamilies.bold,
    padding: 0,
    textAlign: 'right',
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
  compactDateChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  saveCtaBtn: {
    height: 48,
    borderRadius: 14,
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
