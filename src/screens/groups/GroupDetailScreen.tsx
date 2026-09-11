import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SharedStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, radii, spacing } from '../../theme';
import {
  SproutText,
  CircleButton,
  AvatarCircle,
  ScreenShell,
  SegmentControl,
  GroupBalanceBanner,
  GroupExpenseRow,
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
  CheckCheck,
  Receipt,
  UserPlus,
  Users,
  Calendar,
  ChevronRight,
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
  const currUserId = currentUser?.user_id || currentUser?.id || '';
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
        title: `Join ${group?.name || 'Group'} on Tabsy`,
        message: `Join my group "${group?.name}" on Tabsy! Use group code: ${groupId}`,
      });
    } catch {
      // The system share sheet was dismissed.
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
          size={44}
          onPress={() => navigation.goBack()}
        />

        <View style={styles.topBarCenter}>
          <SproutText style={styles.topBarEyebrow}>
            SHARED RHYTHM
          </SproutText>
          <SproutText style={styles.topBarTitle} numberOfLines={1}>
            {group?.name || 'Group'}
          </SproutText>
        </View>

        <View style={styles.topBarActions}>
          <CircleButton
            icon={<Settings size={18} color={colors.text} />}
            size={44}
            onPress={() => navigation.navigate('GroupSettings', { groupId })}
            style={{ marginRight: spacing.sm }}
            accessibilityLabel="Group settings"
          />
          <AvatarCircle
            name={currentUser?.display_name}
            email={currentUser?.email}
            avatarUrl={currentUser?.avatar_url}
            size={44}
            onPress={() => rootNavigation.navigate('Profile')}
          />
        </View>
      </View>

      {/* Signature Sprout Group Balance Banner */}
      <GroupBalanceBanner
        netBalance={netBalance}
        members={members}
        groupName={group?.name}
        groupDescription={group?.description}
        groupType={group?.type}
        onSharePress={handleShareInvite}
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

      {/* Keep the original three-destination group navigation visible. */}
      <View style={styles.tabsContainer}>
        <SegmentControl
          options={tabOptions}
          value={subTab}
          onChange={(value) => setSubTab(value)}
        />
      </View>

      {/* Content depending on selected subtab */}
      {subTab === 'expenses' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SproutText style={styles.sectionTitle}>
              Group Activity
            </SproutText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => rootNavigation.navigate('AddGroupExpenseModal', { groupId })}
              style={styles.addBtn}
            >
              <PlusCircle size={15} color={colors.accent} style={{ marginRight: 4 }} />
              <SproutText style={styles.addBtnText}>
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
              {expenses.map((expense) => (
                <GroupExpenseRow
                  key={expense.id}
                  expense={expense}
                  currentUserId={currUserId}
                  memberCount={members.length}
                />
              ))}

              <View style={styles.confirmNote}>
                <CheckCheck size={14} color={colors.muted} />
                <SproutText style={styles.confirmText}>
                  All group shares have been recorded.
                </SproutText>
              </View>
            </View>
          )}
        </View>
      )}

      {subTab === 'balances' && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settlementBanner}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MonthlySettlementDetail', { groupId, groupName: group?.name })}
          >
            <View style={styles.settlementBannerLeft}>
              <View style={styles.settlementIconCircle}>
                <Calendar size={18} color={colors.accent} />
              </View>
              <View>
                <SproutText variant="body" color={colors.text} weight="700">
                  Monthly Settlements
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Member finalization & lock status
                </SproutText>
              </View>
            </View>
            <ChevronRight size={18} color={colors.accent} />
          </TouchableOpacity>

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
    paddingBottom: 116,
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
  topBarEyebrow: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  topBarTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 21,
    letterSpacing: -0.8,
    color: colors.text,
    marginTop: 2,
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
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: colors.accent,
  },
  expensesList: {
    gap: 0,
  },
  confirmNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  confirmText: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    color: colors.muted,
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
    gap: spacing.xs,
  },
  addMemberCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  addMemberEyebrow: {
    marginBottom: spacing.xs,
  },
  addMemberRow: {
    gap: spacing.sm,
  },
  addMemberSubmit: {
    backgroundColor: colors.accent,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  membersList: {
    gap: 0,
  },
  settlementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  settlementBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settlementIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
