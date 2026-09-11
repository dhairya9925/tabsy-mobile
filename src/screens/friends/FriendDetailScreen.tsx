import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SharedStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, radii, spacing } from '../../theme';
import {
  SproutText,
  ScreenShell,
  CircleButton,
  FriendBalanceBanner,
  FriendExpenseRow,
  Toast,
} from '../../components';
import { friendsApi } from '../../api/friends';
import { useAuthStore } from '../../store/useAuthStore';
import { FriendProfile, FriendExpenseFeedItem } from '../../types';
import { ArrowLeft, UserMinus, Plus, HandCoins, Receipt } from 'lucide-react-native';

type FriendDetailRouteProp = RouteProp<SharedStackParamList, 'FriendDetail'>;

export const FriendDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SharedStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<FriendDetailRouteProp>();
  const { friendId, friendName = 'Friend' } = route.params;

  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [netBalance, setNetBalance] = useState<number>(0);
  const [expenses, setExpenses] = useState<FriendExpenseFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadFriendData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [profData, balancesData, expensesData] = await Promise.all([
        friendsApi.getFriendProfile(friendId).catch(() => null),
        friendsApi.getFriendBalances().catch(() => []),
        friendsApi.getFriendExpenses(friendId).catch(() => []),
      ]);

      if (profData) setProfile(profData);

      const bal = balancesData.find((b) => b.friendId === friendId);
      setNetBalance(bal?.netBalance || 0);

      setExpenses(expensesData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load friend details');
    } finally {
      setIsLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFriendData();
    });
    return unsubscribe;
  }, [navigation, loadFriendData]);

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await friendsApi.deleteFriendExpense(friendId, expenseId);
      setSuccessMessage('Expense deleted');
      loadFriendData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete expense');
    }
  };

  const handleRemoveFriend = () => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName}? Their past shared expenses will remain intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get friends list to find friendship ID
              const allFriends = await friendsApi.getFriends();
              const currId = currentUser?.user_id || currentUser?.id;
              const fRecord = allFriends.find(
                (f) => (f.user_id === currId && f.friend_id === friendId) ||
                       (f.friend_id === currId && f.user_id === friendId) ||
                       (f.profile?.user_id === friendId)
              );

              if (fRecord) {
                await friendsApi.removeFriend(fRecord.id);
              }
              navigation.goBack();
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleOpenSettleUp = () => {
    rootNavigation.navigate('FriendSettleUpModal', {
      friendId,
      friendName,
      netBalance,
    });
  };

  const handleOpenAddExpense = () => {
    rootNavigation.navigate('AddFriendExpenseModal', {
      friendId,
      friendName,
    });
  };

  return (
    <ScreenShell
      isRefreshing={isLoading}
      onRefresh={loadFriendData}
      contentContainerStyle={styles.container}
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

      {/* Header bar */}
      <View style={styles.header}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />

        <View style={styles.headerCenter}>
          <SproutText style={styles.headerEyebrow}>
            1-ON-1 RHYTHM
          </SproutText>
          <SproutText style={styles.headerTitle} numberOfLines={1}>
            {friendName}
          </SproutText>
        </View>

        <CircleButton
          icon={<UserMinus size={18} color={colors.negative} />}
          onPress={handleRemoveFriend}
        />
      </View>

      {/* Hero Balance Banner */}
      <FriendBalanceBanner
        friendName={friendName}
        netBalance={netBalance}
        onSettleUp={netBalance !== 0 ? handleOpenSettleUp : undefined}
      />

      {/* Keep direct shared actions visible, as in the original detail layout. */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenAddExpense}
          style={styles.primaryActionBtn}
        >
          <Plus size={16} color={colors.onAccent} style={{ marginRight: 6 }} />
          <SproutText variant="caption" color={colors.onAccent} weight="700">
            Add Expense
          </SproutText>
        </TouchableOpacity>
        {netBalance !== 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenSettleUp}
            style={styles.secondaryActionBtn}
          >
            <HandCoins size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <SproutText variant="caption" color={colors.accent} weight="700">
              Settle Up
            </SproutText>
          </TouchableOpacity>
        )}
      </View>

      {/* Shared Expenses Section */}
      <View style={styles.expensesSection}>
        <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
          SHARED EXPENSES
        </SproutText>

        {expenses.length === 0 && !isLoading ? (
          <View style={styles.emptyCard}>
            <Receipt size={36} color={colors.muted} strokeWidth={1.5} />
            <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
              No shared expenses found
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={styles.emptyDesc}>
              Add an expense to start splitting with {friendName}.
            </SproutText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenAddExpense}
              style={styles.emptyBtn}
            >
              <SproutText variant="caption" color={colors.onAccent} weight="700">
                + Add Expense
              </SproutText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.expensesList}>
            {expenses.map((expense) => (
              <FriendExpenseRow
                key={expense.id}
                expense={expense}
                currentUserId={currentUser?.user_id || currentUser?.id}
                friendName={friendName}
                onDelete={() => handleDeleteExpense(expense.id)}
              />
            ))}
          </View>
        )}
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 116,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerEyebrow: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 21,
    letterSpacing: -0.8,
    color: colors.text,
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    minHeight: 44,
    borderRadius: 22,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  expensesSection: {
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  expensesList: {
    gap: 0,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptyDesc: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
});
