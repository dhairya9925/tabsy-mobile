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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  SegmentControl,
  CategoryChip,
  FieldRow,
  Toast,
} from '../../components';
import { expensesApi } from '../../api/expenses';
import { friendsApi } from '../../api/friends';
import { useAuthStore } from '../../store/useAuthStore';
import { Category, FriendRecord } from '../../types';
import { toLocalDateString } from '../../utils/formatters';
import { RootStackParamList } from '../../navigation/types';
import { X, MoreHorizontal, FileText, Calendar, Users, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const AddExpenseModal: React.FC = () => {
  const navigation = useNavigation();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);

  const [mode, setMode] = useState<'personal' | 'friend' | 'group'>('personal');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // 1-on-1 friend fields
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');
  const [paidBy, setPaidBy] = useState<'me' | 'them'>('me');
  const [splitType, setSplitType] = useState<'equal' | 'full'>('equal');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Default categories matching frontend/src/lib/categories.ts
  const defaultCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining' },
    { id: 'cat-transport', name: 'Transport' },
    { id: 'cat-shop', name: 'Shopping' },
    { id: 'cat-bills', name: 'Bills & Utilities' },
    { id: 'cat-other', name: 'Other' },
  ];

  useEffect(() => {
    expensesApi.getCategories()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setSelectedCategoryId(data[0].id);
        } else {
          setCategories(defaultCategories);
          setSelectedCategoryId(defaultCategories[0].id);
        }
      })
      .catch(() => {
        setCategories(defaultCategories);
        setSelectedCategoryId(defaultCategories[0].id);
      });

    // Fetch friends in background for 1-on-1 mode
    friendsApi.getFriends().then((fList) => {
      setFriends(fList);
      if (fList.length > 0 && !selectedFriendId) {
        const first = fList[0];
        const otherId = first.user_id === currentUser?.id ? first.friend_id : first.user_id;
        setSelectedFriendId(otherId);
        setSelectedFriendName(first.profile?.display_name || first.profile?.email || 'Friend');
      }
    }).catch(() => {});
  }, [currentUser]);

  const handleSelectFriend = (f: FriendRecord) => {
    const otherId = f.user_id === currentUser?.id ? f.friend_id : f.user_id;
    const name = f.profile?.display_name || f.profile?.email || 'Friend';
    setSelectedFriendId(otherId);
    setSelectedFriendName(name);
  };

  const handleSave = async () => {
    setErrorMessage('');
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const catName = selectedCat?.name || 'Other';

      if (mode === 'personal') {
        await expensesApi.createPersonalExpense({
          amount: parsedAmount,
          category: catName,
          note: description.trim() || undefined,
          expense_date: dateStr,
        });

        setSuccessMessage('Expense added successfully');
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } else if (mode === 'friend') {
        if (!selectedFriendId) {
          setErrorMessage('Please select a friend to split with.');
          setIsSubmitting(false);
          return;
        }

        const payerId = paidBy === 'me'
          ? (currentUser?.id || currentUser?.user_id || '')
          : selectedFriendId;

        await friendsApi.createFriendExpense(selectedFriendId, {
          amount: parsedAmount,
          category: catName,
          note: description.trim() || undefined,
          expense_date: dateStr,
          paid_by: payerId,
          split_type: splitType,
        });

        setSuccessMessage('1-on-1 expense added successfully');
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } else if (mode === 'group') {
        // Redirect to full group modal
        navigation.goBack();
        rootNavigation.navigate('AddGroupExpenseModal');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeOptions = [
    { value: 'personal' as const, label: 'Personal' },
    { value: 'friend' as const, label: '1-on-1' },
    { value: 'group' as const, label: 'Group' },
  ];

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

        {/* Top Header Bar */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={() => navigation.goBack()}
          />
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Add Expense
          </SproutText>
          <CircleButton
            icon={<MoreHorizontal size={20} color={colors.text} />}
            onPress={() => {}}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Display with Currency Symbol */}
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

          {/* Mode Switcher */}
          <SegmentControl
            options={modeOptions}
            value={mode}
            onChange={(val) => setMode(val)}
          />

          {/* 1-on-1 Mode Options */}
          {mode === 'friend' && (
            <View style={{ marginTop: spacing.md }}>
              {/* Friend Selector */}
              <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
                SPLIT WITH
              </SproutText>
              {friends.length === 0 ? (
                <View style={styles.emptyFriendsBanner}>
                  <SproutText variant="caption" color={colors.muted}>
                    No friends found. Add a friend first to split 1-on-1.
                  </SproutText>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {friends.map((f) => {
                    const fid = f.user_id === currentUser?.id ? f.friend_id : f.user_id;
                    const isSelected = selectedFriendId === fid;
                    const name = f.profile?.display_name || f.profile?.email || 'Friend';
                    return (
                      <TouchableOpacity
                        key={f.id}
                        activeOpacity={0.8}
                        onPress={() => handleSelectFriend(f)}
                        style={[
                          styles.chipBtn,
                          isSelected && styles.chipBtnActive,
                        ]}
                      >
                        <Users size={14} color={isSelected ? colors.onAccent : colors.muted} style={{ marginRight: 6 }} />
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
              <SproutText variant="eyebrow" color={colors.muted} style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                WHO PAID?
              </SproutText>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPaidBy('me')}
                  style={[styles.toggleBtn, paidBy === 'me' && styles.toggleBtnActive]}
                >
                  <SproutText
                    variant="caption"
                    color={paidBy === 'me' ? colors.onAccent : colors.text}
                    weight="700"
                  >
                    You
                  </SproutText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPaidBy('them')}
                  style={[styles.toggleBtn, paidBy === 'them' && styles.toggleBtnActive]}
                >
                  <SproutText
                    variant="caption"
                    color={paidBy === 'them' ? colors.onAccent : colors.text}
                    weight="700"
                  >
                    {selectedFriendName || 'Friend'}
                  </SproutText>
                </TouchableOpacity>
              </View>

              {/* How to split */}
              <SproutText variant="eyebrow" color={colors.muted} style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                HOW TO SPLIT
              </SproutText>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSplitType('equal')}
                  style={[styles.toggleBtn, splitType === 'equal' && styles.toggleBtnActive]}
                >
                  <SproutText
                    variant="caption"
                    color={splitType === 'equal' ? colors.onAccent : colors.text}
                    weight="700"
                  >
                    Split Equally
                  </SproutText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSplitType('full')}
                  style={[styles.toggleBtn, splitType === 'full' && styles.toggleBtnActive]}
                >
                  <SproutText
                    variant="caption"
                    color={splitType === 'full' ? colors.onAccent : colors.text}
                    weight="700"
                  >
                    {paidBy === 'me' ? 'They owe full' : 'You owe full'}
                  </SproutText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Group Mode Banner Link */}
          {mode === 'group' && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                navigation.goBack();
                rootNavigation.navigate('AddGroupExpenseModal');
              }}
              style={styles.groupBanner}
            >
              <View style={{ flex: 1 }}>
                <SproutText variant="subtitle" color={colors.text} style={{ fontWeight: '700' }}>
                  Group Split Mode
                </SproutText>
                <SproutText variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
                  Split across multiple members with equal or custom allocation.
                </SproutText>
              </View>
              <ArrowRight size={20} color={colors.accent} />
            </TouchableOpacity>
          )}

          {/* Categories Horizontal Carousel */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              CATEGORY
            </SproutText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  isSelected={selectedCategoryId === cat.id}
                  onSelect={(id) => setSelectedCategoryId(id)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Details Form Fields */}
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

        {/* Bottom Save Action */}
        <View style={styles.bottomBar}>
          <SproutButton
            label={mode === 'group' ? 'Continue to Group Split' : 'Save Expense'}
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
    marginVertical: spacing.lg,
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
    fontSize: 48,
    marginRight: 4,
    color: colors.accent,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: 'JetBrainsMono',
    fontWeight: '700',
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  horizontalScroll: {
    paddingVertical: 4,
    gap: spacing.sm,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  emptyFriendsBanner: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  groupBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.md,
    ...shadows.card,
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
