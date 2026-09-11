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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  Toast,
} from '../../components';
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

export const AddGroupExpenseModal: React.FC<Props> = ({ route, navigation }) => {
  const initialGroupId = route.params?.groupId;
  const currentUser = useAuthStore((s) => s.user);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || '');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [paidByUserId, setPaidByUserId] = useState<string>(currentUser?.id || currentUser?.user_id || '');

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
        const allIds = new Set(mList.map((m) => m.user_id));
        setSelectedMemberIds(allIds);

        const currId = currentUser?.id || currentUser?.user_id || '';
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
  const hasDecimal = amountStr.includes('.');

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
    try {
      const selectedCat = DEFAULT_SPROUT_CATEGORIES.find((c) => c.id === selectedCategoryId);
      const catName = selectedCat?.name || 'Other';

      await groupsApi.createGroupExpense(selectedGroupId, {
        amount: numericAmount,
        category: catName,
        note: description.trim() || undefined,
        expense_date: dateStr,
        paid_by: paidByUserId || (currentUser?.id || currentUser?.user_id),
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
              Add group expense
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
          {/* Amount Card */}
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

          {/* Group Selector (if multiple groups) */}
          {groups.length > 1 && (
            <View style={styles.subSectionCard}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.subSectionTitle}>
                SELECT GROUP
              </SproutText>
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
            </View>
          )}

          {/* Paid By Selector */}
          <View style={styles.subSectionCard}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.subSectionTitle}>
              PAID BY
            </SproutText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
              {members.map((m) => {
                const isSelected = paidByUserId === m.user_id;
                const isYou = m.user_id === (currentUser?.id || currentUser?.user_id);
                const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    activeOpacity={0.8}
                    onPress={() => setPaidByUserId(m.user_id)}
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

            {/* Split Method Toggle */}
            <View style={styles.pillToggleGroup}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.pillGroupLabel}>
                SPLIT METHOD
              </SproutText>
              <View style={styles.pillToggleRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSplitMethod('equal')}
                  style={[styles.togglePill, splitMethod === 'equal' && styles.togglePillSelected]}
                >
                  <SproutText
                    variant="caption"
                    color={splitMethod === 'equal' ? colors.accent : colors.muted}
                    weight={splitMethod === 'equal' ? '800' : '600'}
                  >
                    Split equally
                  </SproutText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSplitMethod('custom')}
                  style={[styles.togglePill, splitMethod === 'custom' && styles.togglePillSelected]}
                >
                  <SproutText
                    variant="caption"
                    color={splitMethod === 'custom' ? colors.accent : colors.muted}
                    weight={splitMethod === 'custom' ? '800' : '600'}
                  >
                    Exact amounts
                  </SproutText>
                </TouchableOpacity>
              </View>

              {/* Live equal breakdown summary */}
              {splitMethod === 'equal' && selectedMemberIds.size > 0 && (
                <View style={[styles.breakdownPill, styles.breakdownPillPositive]}>
                  <SproutText variant="caption" color="#25603A" weight="700">
                    {numericAmount > 0
                      ? `₹${(numericAmount / selectedMemberIds.size).toFixed(2)} each across ${selectedMemberIds.size} members`
                      : `Split equally among ${selectedMemberIds.size} members`}
                  </SproutText>
                </View>
              )}

              {/* Members inclusion list */}
              {splitMethod === 'equal' && (
                <View style={styles.membersList}>
                  {members.map((m) => {
                    const isIncluded = selectedMemberIds.has(m.user_id);
                    const isYou = m.user_id === (currentUser?.id || currentUser?.user_id);
                    const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                    return (
                      <TouchableOpacity
                        key={m.user_id}
                        activeOpacity={0.8}
                        onPress={() => toggleMemberSelection(m.user_id)}
                        style={[styles.memberRow, isIncluded && styles.memberRowIncluded]}
                      >
                        <View style={[styles.checkCircle, isIncluded && styles.checkCircleActive]}>
                          {isIncluded && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <SproutText variant="body" color={colors.text} style={{ flex: 1 }}>
                          {name}
                        </SproutText>
                        <SproutText variant="caption" color={colors.muted} weight="600">
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
                <View style={styles.membersList}>
                  {members.map((m) => {
                    const isYou = m.user_id === (currentUser?.id || currentUser?.user_id);
                    const name = isYou ? 'You' : (m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member');
                    return (
                      <View key={m.user_id} style={styles.customMemberRow}>
                        <SproutText variant="body" color={colors.text} style={{ flex: 1 }}>
                          {name}
                        </SproutText>
                        <View style={styles.customInputBox}>
                          <SproutText variant="caption" color={colors.muted} style={{ marginRight: 2 }}>
                            ₹
                          </SproutText>
                          <TextInput
                            style={styles.customTextInput}
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
          </View>

          {/* Category Grid */}
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

          {/* Details Fields */}
          <View style={styles.fieldsContainer}>
            {/* Note Field */}
            <View style={styles.sproutFieldRow}>
              <FileText size={18} color={colors.muted} strokeWidth={1.8} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Dinner at Social"
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

          {/* Affirmation Note */}
          <View style={styles.affirmationRow}>
            <CheckCheck size={16} color={colors.accent} strokeWidth={2.4} />
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
  sproutAmountCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: 12,
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
  horizontalChips: {
    gap: spacing.sm,
    paddingVertical: 4,
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
  membersList: {
    marginTop: 10,
    gap: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  memberRowIncluded: {
    backgroundColor: '#F3F8F1',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: colors.surface,
  },
  checkCircleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  customMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  customInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 100,
  },
  customTextInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fontFamilies.bold,
    padding: 0,
    textAlign: 'right',
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
    paddingHorizontal: spacing.xl,
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
