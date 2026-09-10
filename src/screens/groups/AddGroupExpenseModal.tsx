import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  CategoryChip,
  FieldRow,
  SegmentControl,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { expensesApi } from '../../api/expenses';
import { useAuthStore } from '../../store/useAuthStore';
import { Group, GroupMember, Category } from '../../types';
import { toLocalDateString, formatCurrencyExact } from '../../utils/formatters';
import { splitEqual, roundMoney } from '../../utils/money';
import { X, Check, UserCheck, FileText, Calendar, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'AddGroupExpenseModal'>;

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Food & Dining');

  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Default fallback categories
  const defaultCategories: Category[] = [
    { id: 'food', name: 'Food & Dining' },
    { id: 'transport', name: 'Transport' },
    { id: 'shopping', name: 'Shopping' },
    { id: 'bills', name: 'Bills & Utilities' },
    { id: 'other', name: 'Other' },
  ];

  // Load groups & categories
  useEffect(() => {
    groupsApi.getGroups()
      .then((gList) => {
        setGroups(gList);
        if (!selectedGroupId && gList.length > 0) {
          setSelectedGroupId(gList[0].id);
        }
      })
      .catch(() => {});

    expensesApi.getCategories()
      .then((cats) => {
        if (cats.length > 0) {
          setCategories(cats);
          setSelectedCategoryName(cats[0].name);
        } else {
          setCategories(defaultCategories);
        }
      })
      .catch(() => setCategories(defaultCategories));
  }, []);

  // When selectedGroupId changes, fetch members
  useEffect(() => {
    if (!selectedGroupId) return;
    setIsLoading(true);
    groupsApi.getGroupMembers(selectedGroupId)
      .then((mList) => {
        setMembers(mList);
        const allIds = new Set(mList.map((m) => m.user_id));
        setSelectedMemberIds(allIds);

        // Default paidBy to current user if present in group
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
      })
      .finally(() => setIsLoading(false));
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

  const handleSave = async () => {
    setErrorMessage('');
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount');
      return;
    }

    if (!selectedGroupId) {
      setErrorMessage('Please select a group');
      return;
    }

    let splits: { user_id: string; amount: number }[] = [];

    if (splitMethod === 'equal') {
      const selected = Array.from(selectedMemberIds);
      if (selected.length === 0) {
        setErrorMessage('Select at least one member to split with');
        return;
      }
      const shares = splitEqual(parsedAmount, selected.length);
      splits = selected.map((uid, idx) => ({
        user_id: uid,
        amount: shares[idx],
      }));
    } else {
      // Custom split
      splits = members
        .filter((m) => customAmounts[m.user_id] && parseFloat(customAmounts[m.user_id]) > 0)
        .map((m) => ({
          user_id: m.user_id,
          amount: parseFloat(customAmounts[m.user_id]),
        }));

      const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(roundMoney(splitSum - parsedAmount)) > 0.02) {
        setErrorMessage(
          `Split amounts (₹${splitSum.toFixed(2)}) must equal total (₹${parsedAmount.toFixed(2)})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await groupsApi.createGroupExpense(selectedGroupId, {
        amount: parsedAmount,
        category: selectedCategoryName,
        note: description.trim() || undefined,
        expense_date: dateStr,
        paid_by: paidByUserId || undefined,
        splits,
      });

      setSuccessMessage('Expense added successfully');
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving group expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const splitOptions = [
    { value: 'equal' as const, label: 'Split Equally' },
    { value: 'custom' as const, label: 'Custom Split' },
  ];

  const totalAmount = parseFloat(amountStr) || 0;
  const equalShares = totalAmount > 0 && selectedMemberIds.size > 0
    ? splitEqual(totalAmount, selectedMemberIds.size)
    : [];

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

        {/* Top Header */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={() => navigation.goBack()}
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Add Group Expense
          </SproutText>
          <View style={{ width: 44 }} />
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

          {/* Group Selector Pill Bar (if multiple groups) */}
          {groups.length > 1 && (
            <View style={styles.section}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
                SELECT GROUP
              </SproutText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroll}>
                {groups.map((g) => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedGroupId(g.id)}
                      style={[
                        styles.groupPill,
                        isSelected && styles.groupPillSelected,
                      ]}
                    >
                      <SproutText
                        variant="caption"
                        color={isSelected ? colors.onAccent : colors.text}
                        weight="700"
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
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              PAID BY
            </SproutText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberChips}>
              {members.map((m) => {
                const isSelected = paidByUserId === m.user_id;
                const name = m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member';
                const isYou = m.user_id === (currentUser?.id || currentUser?.user_id);
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    activeOpacity={0.8}
                    onPress={() => setPaidByUserId(m.user_id)}
                    style={[
                      styles.payerChip,
                      isSelected && styles.payerChipSelected,
                    ]}
                  >
                    <UserCheck size={14} color={isSelected ? colors.onAccent : colors.accent} style={{ marginRight: 4 }} />
                    <SproutText
                      variant="caption"
                      color={isSelected ? colors.onAccent : colors.text}
                      weight="700"
                    >
                      {isYou ? 'You' : name}
                    </SproutText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Split Mode Toggle */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              SPLIT METHOD
            </SproutText>
            <SegmentControl
              options={splitOptions}
              value={splitMethod}
              onChange={(val) => setSplitMethod(val)}
            />
          </View>

          {/* Split Allocation Members List */}
          <View style={styles.splitCard}>
            <SproutText variant="caption" color={colors.muted} weight="700" style={styles.splitCardTitle}>
              {splitMethod === 'equal'
                ? `Split among ${selectedMemberIds.size} members (₹${equalShares[0] ? equalShares[0].toFixed(2) : '0.00'} each)`
                : 'Enter exact amount per member:'}
            </SproutText>

            {members.map((m, idx) => {
              const isSelected = selectedMemberIds.has(m.user_id);
              const name = m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member';
              const isYou = m.user_id === (currentUser?.id || currentUser?.user_id);

              return (
                <View key={m.user_id} style={styles.memberSplitRow}>
                  {splitMethod === 'equal' ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => toggleMemberSelection(m.user_id)}
                      style={styles.checkboxRow}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
                      </View>
                      <SproutText variant="body" color={colors.text} weight="600" style={styles.splitName}>
                        {isYou ? 'You' : name}
                      </SproutText>
                      {isSelected && (
                        <SproutText variant="caption" color={colors.accent} weight="700">
                          {equalShares[idx] ? `₹${equalShares[idx].toFixed(2)}` : '—'}
                        </SproutText>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.customSplitRow}>
                      <SproutText variant="body" color={colors.text} weight="600" style={styles.splitName}>
                        {isYou ? 'You' : name}
                      </SproutText>
                      <View style={styles.customInputWrap}>
                        <SproutText variant="caption" color={colors.muted}>₹</SproutText>
                        <TextInput
                          style={styles.customAmountInput}
                          placeholder="0.00"
                          placeholderTextColor={colors.muted}
                          keyboardType="numeric"
                          value={customAmounts[m.user_id] || ''}
                          onChangeText={(text) =>
                            setCustomAmounts((prev) => ({ ...prev, [m.user_id]: text }))
                          }
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Categories Horizontal Carousel */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              CATEGORY
            </SproutText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  isSelected={selectedCategoryName.toLowerCase() === cat.name.toLowerCase()}
                  onSelect={() => setSelectedCategoryName(cat.name)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Note & Date Fields */}
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

        {/* Bottom CTA */}
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
  currencyPrefix: {
    fontSize: 44,
    marginRight: 4,
    color: colors.accent,
  },
  amountInput: {
    fontSize: 44,
    fontFamily: 'JetBrainsMono',
    fontWeight: '700',
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  groupScroll: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  groupPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  groupPillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  memberChips: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  payerChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  splitCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  splitCardTitle: {
    marginBottom: spacing.sm,
  },
  memberSplitRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  splitName: {
    flex: 1,
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    width: 100,
    height: 36,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'JetBrainsMono',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    padding: 0,
    marginLeft: 4,
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
