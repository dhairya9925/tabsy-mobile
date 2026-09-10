import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  CategoryChip,
  FieldRow,
  Toast,
} from '../../components';
import { friendsApi } from '../../api/friends';
import { expensesApi } from '../../api/expenses';
import { useAuthStore } from '../../store/useAuthStore';
import { FriendRecord, Category } from '../../types';
import { toLocalDateString } from '../../utils/formatters';
import { RootStackParamList } from '../../navigation/types';
import { X, FileText, Calendar, Users, Check } from 'lucide-react-native';

type AddFriendExpenseRouteProp = RouteProp<RootStackParamList, 'AddFriendExpenseModal'>;

export const AddFriendExpenseModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddFriendExpenseRouteProp>();
  const currentUser = useAuthStore((s) => s.user);

  const initialFriendId = route.params?.friendId || '';
  const initialFriendName = route.params?.friendName || '';

  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState(initialFriendId);
  const [selectedFriendName, setSelectedFriendName] = useState(initialFriendName);

  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState<'me' | 'them'>('me');
  const [splitType, setSplitType] = useState<'equal' | 'full'>('equal');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Food & Dining');
  const [note, setNote] = useState('');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Load friends list if not preselected
    friendsApi.getFriends().then((data) => {
      setFriends(data);
      if (!selectedFriendId && data.length > 0) {
        const first = data[0];
        const otherId = first.user_id === currentUser?.id ? first.friend_id : first.user_id;
        setSelectedFriendId(otherId);
        setSelectedFriendName(first.profile?.display_name || first.profile?.email || 'Friend');
      }
    }).catch(() => {});

    // Load categories
    expensesApi.getCategories().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
        setSelectedCategory(data[0].name);
      }
    }).catch(() => {});
  }, [currentUser, selectedFriendId]);

  const handleSelectFriend = (friend: FriendRecord) => {
    const otherId = friend.user_id === currentUser?.id ? friend.friend_id : friend.user_id;
    const name = friend.profile?.display_name || friend.profile?.email || 'Friend';
    setSelectedFriendId(otherId);
    setSelectedFriendName(name);
  };

  const handleSave = async () => {
    setErrorMessage('');
    const parsedAmount = parseFloat(amountStr);

    if (!selectedFriendId) {
      setErrorMessage('Please select a friend to split with.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payerId = paidBy === 'me' ? (currentUser?.id || currentUser?.user_id || '') : selectedFriendId;

      await friendsApi.createFriendExpense(selectedFriendId, {
        amount: parsedAmount,
        category: selectedCategory,
        note: note.trim() || undefined,
        expense_date: dateStr,
        paid_by: payerId,
        split_type: splitType,
      });

      setSuccessMessage('Expense added successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save expense');
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
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={() => navigation.goBack()}
          />
          <SproutText variant="title" color={colors.text}>
            Add 1-on-1 Expense
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* Amount Box */}
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
              />
            </View>
          </View>

          {/* Friend Selector */}
          {!initialFriendId && friends.length > 0 && (
            <View style={styles.section}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
                SPLIT WITH
              </SproutText>
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
            </View>
          )}

          {/* Who Paid Section */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
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
          </View>

          {/* How to Split Section */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
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

          {/* Categories Horizontal Carousel */}
          <View style={styles.section}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              CATEGORY
            </SproutText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  isSelected={selectedCategory === cat.name}
                  onSelect={() => setSelectedCategory(cat.name)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Fields */}
          <View style={styles.section}>
            <FieldRow
              label="Note (Optional)"
              placeholder="Dinner, cab..."
              value={note}
              onChangeText={setNote}
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  amountContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.lg,
    ...shadows.card,
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
    marginBottom: spacing.lg,
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
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
