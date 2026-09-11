import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  Toast,
} from '../../components';
import { friendsApi } from '../../api/friends';
import { useAuthStore } from '../../store/useAuthStore';
import { FriendRecord } from '../../types';
import { toLocalDateString, getInitials } from '../../utils/formatters';
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
} from 'lucide-react-native';
import { getEntryEyebrow, formatFriendlyDate } from '../journal/AddExpenseModal';

type AddFriendExpenseRouteProp = RouteProp<RootStackParamList, 'AddFriendExpenseModal'>;

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('food');
  const [note, setNote] = useState('');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Load friends list if not preselected
    friendsApi.getFriends().then((data) => {
      setFriends(data);
      if (!selectedFriendId && data.length > 0) {
        const first = data[0];
        const myUserId = currentUser?.user_id || currentUser?.id;
        const otherId = first.profile?.user_id || (first.user_id === myUserId ? first.friend_id : first.user_id);
        setSelectedFriendId(otherId);
        setSelectedFriendName(first.profile?.display_name || first.profile?.email || 'Friend');
      }
    }).catch(() => {});
  }, [currentUser, selectedFriendId]);

  const handleSelectFriend = (friend: FriendRecord) => {
    const myUserId = currentUser?.user_id || currentUser?.id;
    const otherId = friend.profile?.user_id || (friend.user_id === myUserId ? friend.friend_id : friend.user_id);
    const name = friend.profile?.display_name || friend.profile?.email || 'Friend';
    setSelectedFriendId(otherId);
    setSelectedFriendName(name);
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

  const handleSave = async () => {
    setErrorMessage('');
    if (!selectedFriendId) {
      setErrorMessage('Please select a friend to split with.');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const myUserId = currentUser?.user_id || currentUser?.id || '';
      const payerId = paidBy === 'me' ? myUserId : selectedFriendId;
      const selectedCat = DEFAULT_SPROUT_CATEGORIES.find((c) => c.id === selectedCategoryId);
      const catSlug = selectedCat?.id || 'other';

      await friendsApi.createFriendExpense(selectedFriendId, {
        amount: numericAmount,
        category: catSlug,
        note: note.trim() || undefined,
        expense_date: dateStr,
        paid_by: payerId,
        split_type: splitType,
      });

      setSuccessMessage('1-on-1 expense recorded!');
      setTimeout(() => {
        navigation.goBack();
      }, 450);
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
              Add 1-on-1 expense
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

          {/* Friend Selector (if multiple friends) */}
          {!initialFriendId && friends.length > 0 && (
            <View style={styles.subSectionCard}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.subSectionTitle}>
                SPLIT WITH
              </SproutText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                {friends.map((f) => {
                  const myUserId = currentUser?.user_id || currentUser?.id;
                  const fid = f.profile?.user_id || (f.user_id === myUserId ? f.friend_id : f.user_id);
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
            </View>
          )}

          {/* Who Paid & Split Controls */}
          <View style={styles.subSectionCard}>
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

            {/* Split method */}
            <View style={[styles.pillToggleGroup, { marginTop: spacing.md }]}>
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
                placeholder="Dinner, coffee, cab..."
                placeholderTextColor={colors.muted}
                value={note}
                onChangeText={setNote}
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
              Clear between friends · Both ledgers update immediately.
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
                  Save friend expense
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
  pillToggleGroup: {
    marginTop: spacing.xs,
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
