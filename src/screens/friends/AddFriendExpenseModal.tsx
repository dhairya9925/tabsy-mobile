import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  SproutAmountInput,
  SegmentControl,
  Toast,
  AvatarCircle,
  FriendPickerSheet,
} from '../../components';
import { useTransitionAutoFocus } from '../../hooks';
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
  Search,
  User,
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

export const AddFriendExpenseModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddFriendExpenseRouteProp>();
  const currentUser = useAuthStore((s) => s.user);

  const amountInputRef = useTransitionAutoFocus();

  const handleDismiss = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const initialFriendId = route.params?.friendId || '';
  const initialFriendName = route.params?.friendName || '';

  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState(initialFriendId);
  const [selectedFriendName, setSelectedFriendName] = useState(initialFriendName);
  const [showFriendPicker, setShowFriendPicker] = useState(false);

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

  const myUserId = currentUser?.user_id || currentUser?.id;

  const selectedFriend = friends.find((f) => {
    const fid = f.profile?.user_id || (f.user_id === myUserId ? f.friend_id : f.user_id);
    return fid === selectedFriendId;
  }) || null;

  const selectedFriendNameComputed = selectedFriend?.profile?.display_name || selectedFriend?.profile?.email || selectedFriendName || 'Friend';
  const selectedFriendEmail = selectedFriend?.profile?.email || null;
  const selectedFriendAvatarUrl = selectedFriend?.profile?.avatar_url || null;

  const handleSelectFriend = (friend: FriendRecord) => {
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
    Keyboard.dismiss();
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
              Add 1-on-1 expense
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
            testID="friend-expense-amount-input"
            style={{ marginBottom: 6 }}
          />

          {/* High-density Friend & Split Card */}
          <View style={styles.compactEntityCard}>
            {/* Row 1: Friend selector & Quick Friends */}
            <View style={styles.compactEntityHeaderRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowFriendPicker(true)}
                style={styles.compactEntityMain}
              >
                {selectedFriend ? (
                  <AvatarCircle
                    name={selectedFriendNameComputed}
                    email={selectedFriendEmail}
                    avatarUrl={selectedFriendAvatarUrl}
                    size={26}
                  />
                ) : (
                  <View style={styles.compactPlaceholderAvatar}>
                    <User size={14} color={colors.accent} />
                  </View>
                )}
                <View style={styles.compactEntityInfo}>
                  <SproutText variant="caption" color={colors.text} weight="700" numberOfLines={1} style={styles.compactEntityName}>
                    {selectedFriendNameComputed} {!initialFriendId && friends.length > 1 ? '▾' : ''}
                  </SproutText>
                </View>
              </TouchableOpacity>

              {/* Quick Friend Avatars */}
              {!initialFriendId && friends.length > 1 && (
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
                        style={[
                          styles.compactQuickAvatarTouch,
                          isSelected && styles.compactQuickAvatarTouchSelected,
                        ]}
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
              <View style={{ flex: 1, marginRight: 6 }}>
                <SproutText variant="eyebrow" color={colors.muted} style={styles.compactControlLabel}>
                  WHO PAID?
                </SproutText>
                <SegmentControl<'me' | 'them'>
                  size="sm"
                  options={[
                    { value: 'me', label: 'You' },
                    { value: 'them', label: selectedFriendName || 'Them' },
                  ]}
                  value={paidBy}
                  onChange={setPaidBy}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 6 }}>
                <SproutText variant="eyebrow" color={colors.muted} style={styles.compactControlLabel}>
                  SPLIT
                </SproutText>
                <SegmentControl<'equal' | 'full'>
                  size="sm"
                  options={[
                    { value: 'equal', label: '50/50' },
                    { value: 'full', label: paidBy === 'me' ? 'They owe full' : 'You owe full' },
                  ]}
                  value={splitType}
                  onChange={setSplitType}
                />
              </View>
            </View>

            {/* Row 3: Result Breakdown */}
            {numericAmount > 0 && (
              <View style={[styles.compactBreakdownPill, paidBy === 'me' ? styles.breakdownPillPositive : styles.breakdownPillNeutral]}>
                <SproutText
                  variant="caption"
                  color={paidBy === 'me' ? '#25603A' : '#7D4734'}
                  weight="700"
                  style={{ fontSize: 11, textAlign: 'center' }}
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
                placeholder="Dinner, cab, groceries..."
                placeholderTextColor={colors.muted}
                value={note}
                onChangeText={setNote}
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

      <FriendPickerSheet
        visible={showFriendPicker}
        friends={friends}
        selectedFriendId={selectedFriendId}
        currentUserId={myUserId}
        onSelectFriend={handleSelectFriend}
        onClose={() => setShowFriendPicker(false)}
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
  compactPlaceholderAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5EFE3',
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
  compactQuickAvatarTouch: {
    borderRadius: radii.full,
    padding: 1,
  },
  compactQuickAvatarTouchSelected: {
    borderWidth: 1.5,
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
