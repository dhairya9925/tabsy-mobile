import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SharedStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  CircleButton,
  ScreenShell,
  SegmentControl,
  GroupBalanceBanner,
  GroupBalanceRow,
  GroupMemberRow,
  FieldRow,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { useAuthStore } from '../../store/useAuthStore';
import { Group, GroupMember, GroupExpense, GroupBalance } from '../../types';
import { getGroupTypeMeta } from '../../utils/groupTypes';
import { formatCurrencyExact, formatDate } from '../../utils/formatters';
import { getCategoryIcon } from '../../components/ExpenseRow';
import {
  ArrowLeft,
  Settings,
  PlusCircle,
  Share2,
  CheckCircle2,
  Receipt,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SharedStackParamList, 'GroupDetail'>;

export const GroupDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [subTab, setSubTab] = useState<'expenses' | 'balances' | 'members'>('expenses');

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [gData, mData, eData, bData] = await Promise.all([
        groupsApi.getGroup(groupId),
        groupsApi.getGroupMembers(groupId).catch(() => []),
        groupsApi.getGroupExpenses(groupId).catch(() => []),
        groupsApi.getGroupBalances(groupId).catch(() => []),
      ]);

      setGroup(gData);
      setMembers(mData);
      setExpenses(eData);
      setBalances(bData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load group details');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Calculate current user's net balance in this group
  const currUserId = currentUser?.id || currentUser?.user_id || '';
  let netBalance = 0;
  balances.forEach((b) => {
    if (b.to_user_id === currUserId) {
      netBalance += b.amount; // user is owed
    }
    if (b.from_user_id === currUserId) {
      netBalance -= b.amount; // user owes
    }
  });

  const handleShareInvite = async () => {
    try {
      await Share.share({
        title: `Join ${group?.name || 'Group'} on SplitTrack`,
        message: `Join my group "${group?.name}" on SplitTrack! Use group code: ${groupId}`,
      });
    } catch {
      // Ignored or dismissed
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      setErrorMessage('Please enter an email address');
      return;
    }
    setIsAddingMember(true);
    try {
      await groupsApi.addGroupMember(groupId, {
        email: newMemberEmail.trim(),
        role: 'member',
      });
      setNewMemberEmail('');
      setSuccessMessage('Member added to group!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = (member: GroupMember) => {
    const memberName = member.profile?.display_name || member.profile?.email || 'Member';
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove "${memberName}" from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.removeGroupMember(groupId, member.user_id);
              setSuccessMessage('Member removed');
              await loadData();
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleSettleBalance = (balance: GroupBalance) => {
    rootNavigation.navigate('SettleUpModal', { groupId, balance });
  };

  const typeMeta = getGroupTypeMeta(group?.type);
  const currentMember = members.find((m) => m.user_id === currUserId);
  const isAdmin = currentMember?.role === 'admin' || group?.created_by === currUserId;

  const tabOptions = [
    { value: 'expenses' as const, label: 'Expenses' },
    { value: 'balances' as const, label: 'Balances' },
    { value: 'members' as const, label: 'Members' },
  ];

  return (
    <ScreenShell
      isRefreshing={isLoading}
      onRefresh={loadData}
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

      {/* Top Header */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />

        <View style={styles.topBarCenter}>
          <SproutText variant="eyebrow" color={colors.accent}>
            {typeMeta.label.toUpperCase()}
          </SproutText>
          <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1}>
            {group?.name || 'Group'}
          </SproutText>
        </View>

        <View style={styles.topBarActions}>
          <CircleButton
            icon={<Share2 size={18} color={colors.accent} />}
            onPress={handleShareInvite}
            style={{ marginRight: spacing.xs }}
          />
          <CircleButton
            icon={<Settings size={18} color={colors.text} />}
            onPress={() => navigation.navigate('GroupSettings', { groupId })}
          />
        </View>
      </View>

      {/* Signature Sprout Group Balance Banner */}
      <GroupBalanceBanner
        netBalance={netBalance}
        members={members}
        onSettlePress={() => {
          if (balances.length > 0) {
            const myDebt = balances.find(
              (b) => b.from_user_id === currUserId || b.to_user_id === currUserId
            );
            if (myDebt) {
              rootNavigation.navigate('SettleUpModal', { groupId, balance: myDebt });
            } else {
              setSubTab('balances');
            }
          } else {
            setSuccessMessage('All settled up in this group!');
          }
        }}
      />

      {/* Subtabs: Expenses | Balances | Members */}
      <View style={styles.tabsContainer}>
        <SegmentControl
          options={tabOptions}
          value={subTab}
          onChange={(val) => setSubTab(val)}
        />
      </View>

      {/* Content depending on selected subtab */}
      {subTab === 'expenses' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SproutText variant="title" color={colors.text}>
              Group Activity
            </SproutText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => rootNavigation.navigate('AddGroupExpenseModal', { groupId })}
              style={styles.addBtn}
            >
              <PlusCircle size={16} color={colors.accent} style={{ marginRight: 4 }} />
              <SproutText variant="caption" color={colors.accent} weight="700">
                + Add Expense
              </SproutText>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <Receipt size={38} color={colors.muted} strokeWidth={1.5} />
              <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
                No group expenses yet
              </SproutText>
              <SproutText variant="caption" color={colors.muted} style={styles.emptyDesc}>
                Split your first group bill with roommates or friends.
              </SproutText>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {expenses.map((expense) => {
                const payer = expense.payer_name || (expense.paid_by === currUserId ? 'You' : 'Member');
                const splitCount = expense.splits?.length || members.length;

                return (
                  <View key={expense.id} style={styles.expenseItem}>
                    <View style={styles.expenseIconCircle}>
                      {getCategoryIcon(expense.category)}
                    </View>

                    <View style={styles.expenseInfo}>
                      <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1}>
                        {expense.note || expense.category}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted}>
                        Paid by {payer} • {formatDate(expense.expense_date)}
                      </SproutText>
                      <SproutText variant="caption" color={colors.accentSoft} style={styles.splitNote}>
                        Split between {splitCount} {splitCount === 1 ? 'member' : 'members'}
                      </SproutText>
                    </View>

                    <SproutText variant="amountRow" color={colors.text} style={styles.expenseAmount}>
                      {formatCurrencyExact(expense.amount)}
                    </SproutText>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {subTab === 'balances' && (
        <View style={styles.section}>
          <SproutText variant="title" color={colors.text} style={styles.sectionTitle}>
            Who Owes Whom
          </SproutText>

          {balances.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={42} color={colors.accent} strokeWidth={1.5} />
              <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
                All settled up!
              </SproutText>
              <SproutText variant="caption" color={colors.muted}>
                No outstanding balances in this group.
              </SproutText>
            </View>
          ) : (
            <View style={styles.balancesList}>
              {balances.map((b, idx) => (
                <GroupBalanceRow
                  key={`${b.from_user_id}-${b.to_user_id}-${idx}`}
                  balance={b}
                  currentUserId={currUserId}
                  onSettle={handleSettleBalance}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {subTab === 'members' && (
        <View style={styles.section}>
          <SproutText variant="title" color={colors.text} style={styles.sectionTitle}>
            Members ({members.length})
          </SproutText>

          {/* Add Member Box */}
          {isAdmin && (
            <View style={styles.addMemberCard}>
              <SproutText variant="eyebrow" color={colors.muted} style={styles.addMemberEyebrow}>
                INVITE BY EMAIL
              </SproutText>
              <View style={styles.addMemberRow}>
                <FieldRow
                  placeholder="friend@example.com"
                  value={newMemberEmail}
                  onChangeText={setNewMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon={<UserPlus size={18} color={colors.muted} />}
                  style={{ marginBottom: 0 }}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAddMember}
                  disabled={isAddingMember}
                  style={styles.addMemberSubmit}
                >
                  <SproutText variant="caption" color={colors.onAccent} weight="700">
                    {isAddingMember ? 'Adding...' : 'Add'}
                  </SproutText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Members List */}
          <View style={styles.membersList}>
            {members.map((member) => (
              <GroupMemberRow
                key={member.id || member.user_id}
                member={member}
                isCurrentUser={member.user_id === currUserId}
                canManage={isAdmin}
                onRemove={() => handleRemoveMember(member)}
              />
            ))}
          </View>
        </View>
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expensesList: {
    gap: 4,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  expenseIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  expenseInfo: {
    flex: 1,
  },
  splitNote: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  expenseAmount: {
    marginLeft: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptyDesc: {
    textAlign: 'center',
  },
  balancesList: {
    gap: 4,
  },
  addMemberCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  addMemberEyebrow: {
    marginBottom: spacing.xs,
  },
  addMemberRow: {
    gap: spacing.sm,
  },
  addMemberSubmit: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  membersList: {
    gap: 4,
  },
});
