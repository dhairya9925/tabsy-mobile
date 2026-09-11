import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SharedStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, radii, spacing } from '../../theme';
import {
  SproutText,
  ScreenShell,
  SegmentControl,
  GroupCard,
  FriendCard,
  BalancePillsRow,
  Toast,
  GroupListSkeleton,
  EmptyState,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { friendsApi } from '../../api/friends';
import { useAuthStore } from '../../store/useAuthStore';
import { Group, FriendRecord, FriendBalance } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Users, UserPlus, KeyRound, UserCheck, Settings, Plus } from 'lucide-react-native';

export const GroupsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SharedStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);

  const [mainTab, setMainTab] = useState<'groups' | 'friends'>('groups');
  const [friendsTab, setFriendsTab] = useState<'friends' | 'pending' | 'sent'>('friends');

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // Friends state
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRecord[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRecord[]>([]);
  const [friendBalances, setFriendBalances] = useState<FriendBalance[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    const currId = currentUser?.id || currentUser?.user_id || '';

    try {
      if (mainTab === 'groups') {
        const gList = await groupsApi.getGroups();
        setGroups(gList);

        const balancesMap: Record<string, number> = {};
        const countsMap: Record<string, number> = {};

        await Promise.all(
          gList.map(async (g) => {
            try {
              const [bList, mList] = await Promise.all([
                groupsApi.getGroupBalances(g.id).catch(() => []),
                groupsApi.getGroupMembers(g.id).catch(() => []),
              ]);

              countsMap[g.id] = mList.length;

              let net = 0;
              bList.forEach((b) => {
                if (b.to_user_id === currId) net += b.amount;
                if (b.from_user_id === currId) net -= b.amount;
              });
              balancesMap[g.id] = net;
            } catch {
              // Ignore per-group failure
            }
          })
        );

        setGroupBalances(balancesMap);
        setMemberCounts(countsMap);
      } else {
        const [friendsData, pendingData, sentData, balancesData] = await Promise.all([
          friendsApi.getFriends().catch(() => []),
          friendsApi.getPendingRequests().catch(() => []),
          friendsApi.getSentRequests().catch(() => []),
          friendsApi.getFriendBalances().catch(() => []),
        ]);

        setFriends(friendsData);
        setPendingRequests(pendingData);
        setSentRequests(sentData);
        setFriendBalances(balancesData);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [mainTab, currentUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Friend actions
  const handleAcceptRequest = async (id: string) => {
    setActionLoadingId(id);
    try {
      await friendsApi.acceptFriendRequest(id);
      setSuccessMessage('Friend request accepted!');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (id: string) => {
    setActionLoadingId(id);
    try {
      await friendsApi.rejectFriendRequest(id);
      setSuccessMessage('Friend request rejected');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (id: string) => {
    setActionLoadingId(id);
    try {
      await friendsApi.removeFriend(id);
      setSuccessMessage('Friend removed');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove friend');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculate friends aggregated balance
  let friendsOwed = 0;
  let friendsOwe = 0;
  friendBalances.forEach((b) => {
    if (b.netBalance > 0) friendsOwed += b.netBalance;
    if (b.netBalance < 0) friendsOwe += Math.abs(b.netBalance);
  });

  // Calculate dynamic header subtitle matching the screenshot ("2 groups, all settled up")
  let headerSubtitle = '';
  if (mainTab === 'groups') {
    if (groups.length === 0) {
      headerSubtitle = 'Create or join your first group';
    } else {
      let totalGroupOwed = 0;
      let totalGroupOwes = 0;
      let nonSettledCount = 0;
      Object.values(groupBalances).forEach((b) => {
        if (b > 0.01) {
          totalGroupOwed += b;
          nonSettledCount++;
        } else if (b < -0.01) {
          totalGroupOwes += Math.abs(b);
          nonSettledCount++;
        }
      });

      const countStr = `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`;
      if (nonSettledCount === 0) {
        headerSubtitle = `${countStr}, all settled up`;
      } else if (totalGroupOwed > 0 && totalGroupOwes === 0) {
        headerSubtitle = `${countStr} · +${formatCurrency(totalGroupOwed)} owed to you`;
      } else if (totalGroupOwes > 0 && totalGroupOwed === 0) {
        headerSubtitle = `${countStr} · -${formatCurrency(totalGroupOwes)} you owe`;
      } else {
        headerSubtitle = `${countStr} · ${nonSettledCount} active`;
      }
    }
  } else {
    if (friends.length === 0) {
      headerSubtitle = 'Manage friends and 1-on-1 expenses';
    } else {
      const nonSettledFriends = friendBalances.filter((b) => Math.abs(b.netBalance) > 0.01).length;
      const countStr = `${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}`;
      if (nonSettledFriends === 0) {
        headerSubtitle = `${countStr}, all settled up`;
      } else if (friendsOwed > 0 && friendsOwe === 0) {
        headerSubtitle = `${countStr} · +${formatCurrency(friendsOwed)} owed to you`;
      } else if (friendsOwe > 0 && friendsOwed === 0) {
        headerSubtitle = `${countStr} · -${formatCurrency(friendsOwe)} you owe`;
      } else {
        headerSubtitle = `${countStr} · ${nonSettledFriends} active balances`;
      }
    }
  }

  const mainTabOptions = [
    { value: 'groups' as const, label: 'Groups' },
    { value: 'friends' as const, label: 'Friends' },
  ];

  const friendTabOptions = [
    { value: 'friends' as const, label: `Friends${friends.length > 0 ? ` (${friends.length})` : ''}` },
    { value: 'pending' as const, label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
    { value: 'sent' as const, label: `Sent${sentRequests.length > 0 ? ` (${sentRequests.length})` : ''}` },
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SproutText style={styles.title}>
            {mainTab === 'groups' ? 'Groups' : 'Friends'}
          </SproutText>
          <SproutText style={styles.subtitle} numberOfLines={1}>
            {headerSubtitle}
          </SproutText>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => rootNavigation.navigate('Settings')}
          style={styles.settingsBtn}
          accessibilityLabel="Open settings"
        >
          <Settings size={18} color="#274837" strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Main Mode Segment Control: Groups | Friends */}
      <SegmentControl
        size="lg"
        options={mainTabOptions}
        value={mainTab}
        onChange={(v) => setMainTab(v)}
        style={styles.mainSegment}
      />

      {/* Action Row */}
      <View style={styles.actionRow}>
        {mainTab === 'groups' ? (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => rootNavigation.navigate('CreateGroupModal')}
              style={styles.primaryActionBtn}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 5 }} />
              <SproutText style={styles.primaryActionBtnText}>
                New group
              </SproutText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => rootNavigation.navigate('JoinGroupModal')}
              style={styles.keyBtn}
              accessibilityLabel="Join group with code"
            >
              <KeyRound size={18} color="#335C44" strokeWidth={2} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => rootNavigation.navigate('AddFriendModal')}
            style={styles.primaryActionBtn}
          >
            <UserPlus size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 5 }} />
            <SproutText style={styles.primaryActionBtnText}>
              Add friend
            </SproutText>
          </TouchableOpacity>
        )}
      </View>


      {/* Groups Segment */}
      {mainTab === 'groups' && (
        <View style={styles.listSection}>
          {isLoading && groups.length === 0 ? (
            <GroupListSkeleton count={4} />
          ) : groups.length === 0 ? (
            <EmptyState
              card
              icon={<Users size={40} color={colors.muted} strokeWidth={1.5} />}
              title="No groups yet"
              subtitle="Create a group for your apartment, road trip, or dinner party."
              actionLabel="+ Create Group"
              onActionPress={() => rootNavigation.navigate('CreateGroupModal')}
            />
          ) : (
            <View style={styles.list}>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  memberCount={memberCounts[group.id] || 1}
                  netBalance={groupBalances[group.id] || 0}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                />
              ))}
            </View>
          )}
        </View>
      )}


      {/* Friends Segment */}
      {mainTab === 'friends' && (
        <View style={styles.listSection}>
          {/* Subtabs: Friends | Requests | Sent */}
          <SegmentControl
            options={friendTabOptions}
            value={friendsTab}
            onChange={(v) => setFriendsTab(v)}
          />

          {/* Subtab: Friends List */}
          {friendsTab === 'friends' && (
            <View style={{ marginTop: spacing.md }}>
              {/* Summary Balance Pills */}
              {(friendsOwed > 0 || friendsOwe > 0) && (
                <View style={{ marginBottom: spacing.md }}>
                  <BalancePillsRow
                    toReceive={friendsOwed}
                    toPay={friendsOwe}
                  />
                </View>
              )}

              {isLoading && friends.length === 0 ? (
                <GroupListSkeleton count={4} />
              ) : friends.length === 0 ? (
                <EmptyState
                  card
                  icon={<UserCheck size={40} color={colors.muted} strokeWidth={1.5} />}
                  title="No friends yet"
                  subtitle="Add someone by email to start tracking 1-on-1 expenses."
                  actionLabel="+ Add Friend"
                  onActionPress={() => rootNavigation.navigate('AddFriendModal')}
                />
              ) : (
                <View style={styles.list}>
                  {friends.map((friend) => {
                    const otherId = friend.user_id === currentUser?.id ? friend.friend_id : friend.user_id;
                    const balanceRecord = friendBalances.find((b) => b.friendId === otherId);
                    const net = balanceRecord?.netBalance || 0;
                    const name = friend.profile?.display_name || friend.profile?.email || 'Friend';

                    return (
                      <FriendCard
                        key={friend.id}
                        friend={friend}
                        currentUserId={currentUser?.id || currentUser?.user_id}
                        netBalance={net}
                        mode="friend"
                        onPress={() => navigation.navigate('FriendDetail', { friendId: otherId, friendName: name })}
                        onRemove={() => handleRemoveFriend(friend.id)}
                        onSettleUp={() => rootNavigation.navigate('FriendSettleUpModal', {
                          friendId: otherId,
                          friendName: name,
                          netBalance: net,
                        })}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Subtab: Pending Requests */}
          {friendsTab === 'pending' && (
            <View style={{ marginTop: spacing.md }}>
              {isLoading && pendingRequests.length === 0 ? (
                <GroupListSkeleton count={2} />
              ) : pendingRequests.length === 0 ? (
                <EmptyState
                  card
                  icon={<Users size={40} color={colors.muted} strokeWidth={1.5} />}
                  title="No pending requests"
                  subtitle="When someone sends you a friend request, it will appear here."
                />
              ) : (
                <View style={styles.list}>
                  {pendingRequests.map((req) => (
                    <FriendCard
                      key={req.id}
                      friend={req}
                      mode="request"
                      isActionLoading={actionLoadingId === req.id}
                      onAccept={() => handleAcceptRequest(req.id)}
                      onReject={() => handleRejectRequest(req.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Subtab: Sent Requests */}
          {friendsTab === 'sent' && (
            <View style={{ marginTop: spacing.md }}>
              {isLoading && sentRequests.length === 0 ? (
                <GroupListSkeleton count={2} />
              ) : sentRequests.length === 0 ? (
                <EmptyState
                  card
                  icon={<Users size={40} color={colors.muted} strokeWidth={1.5} />}
                  title="No sent requests"
                  subtitle="Friend requests you send to other users will appear here."
                />
              ) : (
                <View style={styles.list}>
                  {sentRequests.map((req) => (
                    <FriendCard
                      key={req.id}
                      friend={req}
                      mode="sent"
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 116,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.sm + 2,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    lineHeight: 32,
    color: '#183228',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#617267',
    marginTop: 2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7FAF5',
    borderWidth: 1.2,
    borderColor: '#CBD7CC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  mainSegment: {
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#355E47',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1.5,
  },
  primaryActionBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  keyBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E2ECE0',
    borderWidth: 1.5,
    borderColor: '#355E47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSection: {
    marginTop: 0,
  },
  list: {
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
    marginTop: spacing.lg,
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
