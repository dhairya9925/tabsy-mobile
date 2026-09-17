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
  AvatarCircle,
  ScreenShell,
  SegmentControl,
  GroupCard,
  FriendCard,
  BalancePillsRow,
  Toast,
  GroupListSkeleton,
  EmptyState,
  JoinGroupPopup,
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
  const [showJoinPopup, setShowJoinPopup] = useState(false);

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

        const currentUserId = currentUser?.id;
        const acceptedFriendIds = new Set<string>();
        const acceptedEmails = new Set<string>();

        friendsData.forEach((f) => {
          const counterpartId = f.user_id === currentUserId ? f.friend_id : f.user_id;
          if (counterpartId) acceptedFriendIds.add(counterpartId);
          if (f.profile?.user_id) acceptedFriendIds.add(f.profile.user_id);
          if (f.profile?.email) acceptedEmails.add(f.profile.email.toLowerCase());
        });

        // Filter out sent requests where counterpart is already an accepted friend or profile is missing
        const validSentData = sentData.filter((s) => {
          if (!s.profile && !s.friend_id) return false;
          const counterpartId = s.user_id === currentUserId ? s.friend_id : s.user_id;
          if (counterpartId && acceptedFriendIds.has(counterpartId)) return false;
          if (s.profile?.user_id && acceptedFriendIds.has(s.profile.user_id)) return false;
          if (s.profile?.email && acceptedEmails.has(s.profile.email.toLowerCase())) return false;
          return true;
        });

        // Background auto-clean stale sent requests on the server
        sentData.forEach((s) => {
          const counterpartId = s.user_id === currentUserId ? s.friend_id : s.user_id;
          const isStale = (!s.profile && !s.friend_id) ||
            (counterpartId && acceptedFriendIds.has(counterpartId)) ||
            (s.profile?.user_id && acceptedFriendIds.has(s.profile.user_id)) ||
            (s.profile?.email && acceptedEmails.has(s.profile.email.toLowerCase()));
          if (isStale && s.id) {
            friendsApi.removeFriend(s.id).catch(() => { });
          }
        });

        // Also filter out pending (incoming) requests where counterpart is already friends
        const validPendingData = pendingData.filter((p) => {
          if (!p.profile && !p.user_id) return false;
          const counterpartId = p.user_id === currentUserId ? p.friend_id : p.user_id;
          if (counterpartId && acceptedFriendIds.has(counterpartId)) return false;
          if (p.profile?.user_id && acceptedFriendIds.has(p.profile.user_id)) return false;
          if (p.profile?.email && acceptedEmails.has(p.profile.email.toLowerCase())) return false;
          return true;
        });

        setFriends(friendsData);
        setPendingRequests(validPendingData);
        setSentRequests(validSentData);
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

  const handleCancelSentRequest = async (id: string) => {
    setActionLoadingId(id);
    try {
      await friendsApi.removeFriend(id);
      setSentRequests((prev) => prev.filter((r) => r.id !== id));
      setSuccessMessage('Friend request cancelled');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel request');
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
          <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            {mainTab === 'groups' ? 'SHARED RHYTHM' : '1-ON-1 RHYTHM'}
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            {mainTab === 'groups' ? 'Groups' : 'Friends'}
          </SproutText>
          <SproutText style={styles.subtitle} numberOfLines={1}>
            {headerSubtitle}
          </SproutText>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => rootNavigation.navigate('Settings')}
            style={[styles.settingsBtn, { marginRight: 8 }]}
            accessibilityLabel="Open settings"
          >
            <Settings size={18} color="#274837" strokeWidth={1.8} />
          </TouchableOpacity>
          <AvatarCircle
            name={currentUser?.display_name}
            email={currentUser?.email}
            avatarUrl={currentUser?.avatar_url}
            size={44}
            onPress={() => rootNavigation.navigate('Profile')}
          />
        </View>
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
              onPress={() => setShowJoinPopup(true)}
              style={styles.secondaryActionBtn}
              accessibilityLabel="Join group with code"
            >
              <KeyRound size={15} color={colors.text} strokeWidth={2.2} style={{ marginRight: 5 }} />
              <SproutText style={styles.secondaryActionBtnText}>
                Join
              </SproutText>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => rootNavigation.navigate('AddFriendModal')}
            style={styles.singleActionBtn}
          >
            <UserPlus size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
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
                    const myUserId = currentUser?.user_id || currentUser?.id;
                    const otherId = friend.profile?.user_id || (friend.user_id === myUserId ? friend.friend_id : friend.user_id);
                    const balanceRecord = friendBalances.find((b) => b.friendId === otherId);
                    const net = balanceRecord?.netBalance || 0;
                    const name = friend.profile?.display_name || friend.profile?.email || 'Friend';

                    return (
                      <FriendCard
                        key={friend.id}
                        friend={friend}
                        currentUserId={myUserId}
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
                      isActionLoading={actionLoadingId === req.id}
                      onCancel={() => handleCancelSentRequest(req.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Pop-up Dialog for Joining a Group */}
      <JoinGroupPopup
        visible={showJoinPopup}
        onClose={() => setShowJoinPopup(false)}
        onSuccess={() => {
          setShowJoinPopup(false);
          setSuccessMessage('Successfully joined group!');
          loadData();
        }}
      />
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
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#6D7C72',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -1.4,
    color: colors.text,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#617267',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.text, // #183228
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flex: 0.9,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.soft, // #E6F0E0
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  secondaryActionBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13.5,
    color: colors.text,
  },
  singleActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
