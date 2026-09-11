import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SharedStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
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
import { Users, FolderPlus, UserPlus, KeyRound, UserCheck } from 'lucide-react-native';

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
          <SproutText variant="eyebrow" color={colors.accent}>
            GROUPS & FRIENDS
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            {mainTab === 'groups' ? 'Groups' : 'Friends'}
          </SproutText>
          <SproutText variant="bodyMuted">
            {mainTab === 'groups'
              ? 'Coordinate expenses with friends and shared groups.'
              : 'Manage your friends and 1-on-1 expenses.'}
          </SproutText>
        </View>

        <View style={styles.headerActions}>
          {mainTab === 'groups' ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => rootNavigation.navigate('CreateGroupModal')}
              style={styles.primaryActionBtn}
            >
              <FolderPlus size={16} color={colors.onAccent} style={{ marginRight: 4 }} />
              <SproutText variant="caption" color={colors.onAccent} weight="700">
                New Group
              </SproutText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => rootNavigation.navigate('AddFriendModal')}
              style={styles.primaryActionBtn}
            >
              <UserPlus size={16} color={colors.onAccent} style={{ marginRight: 4 }} />
              <SproutText variant="caption" color={colors.onAccent} weight="700">
                Add Friend
              </SproutText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Mode Segment Control: Groups | Friends */}
      <SegmentControl
        options={mainTabOptions}
        value={mainTab}
        onChange={(v) => setMainTab(v)}
      />

      {/* Groups Segment */}
      {mainTab === 'groups' && (
        <View style={styles.listSection}>
          <View style={styles.actionsBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => rootNavigation.navigate('JoinGroupModal')}
              style={styles.joinBtn}
            >
              <KeyRound size={14} color={colors.accent} style={{ marginRight: 4 }} />
              <SproutText variant="caption" color={colors.accent} weight="700">
                Join with Code
              </SproutText>
            </TouchableOpacity>
          </View>

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
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    marginVertical: 2,
  },
  headerActions: {
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    ...shadows.card,
  },
  listSection: {
    marginTop: spacing.md,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  list: {
    gap: spacing.xs,
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
