import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { useAuthStore } from '../../store/useAuthStore';
import { Group } from '../../types';
import { Users, FolderPlus, UserPlus, KeyRound } from 'lucide-react-native';

export const GroupsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SharedStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);

  const [subTab, setSubTab] = useState<'groups' | 'friends'>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadGroupsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const gList = await groupsApi.getGroups();
      setGroups(gList);

      // Fetch balances & members for each group in parallel
      const balancesMap: Record<string, number> = {};
      const countsMap: Record<string, number> = {};
      const currId = currentUser?.id || currentUser?.user_id || '';

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
            // Ignored per-group failure
          }
        })
      );

      setGroupBalances(balancesMap);
      setMemberCounts(countsMap);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadGroupsData();
    });
    return unsubscribe;
  }, [navigation, loadGroupsData]);

  const options = [
    { value: 'groups' as const, label: 'Groups' },
    { value: 'friends' as const, label: 'Friends' },
  ];

  return (
    <ScreenShell
      isRefreshing={isLoading}
      onRefresh={loadGroupsData}
      contentContainerStyle={styles.container}
    >
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SproutText variant="eyebrow" color={colors.accent}>
            GROUPS & FRIENDS
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            Groups
          </SproutText>
          <SproutText variant="bodyMuted">
            Coordinate expenses with friends and shared groups.
          </SproutText>
        </View>

        <View style={styles.headerActions}>
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
        </View>
      </View>

      {/* Subtab Segment Control */}
      <SegmentControl
        options={options}
        value={subTab}
        onChange={(v) => setSubTab(v)}
      />

      {/* Groups List Segment */}
      {subTab === 'groups' ? (
        <View style={styles.listSection}>
          {/* Quick actions row */}
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

          {groups.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <Users size={40} color={colors.muted} strokeWidth={1.5} />
              <SproutText variant="subtitle" color={colors.text} style={styles.emptyTitle}>
                No groups yet
              </SproutText>
              <SproutText variant="caption" color={colors.muted} style={styles.emptyDesc}>
                Create a group for your apartment, road trip, or dinner party.
              </SproutText>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => rootNavigation.navigate('CreateGroupModal')}
                style={styles.emptyBtn}
              >
                <SproutText variant="caption" color={colors.onAccent} weight="700">
                  + Create Group
                </SproutText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groupsList}>
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
      ) : (
        /* Friends Segment Teaser (Phase 4) */
        <View style={styles.friendsTeaserCard}>
          <UserPlus size={36} color={colors.accent} strokeWidth={1.5} />
          <SproutText variant="subtitle" color={colors.text} style={styles.teaserTitle}>
            1-on-1 Friends
          </SproutText>
          <SproutText variant="caption" color={colors.muted} style={styles.teaserDesc}>
            Track individual balances, simplify debts, and record peer payments. Coming in Phase 4.
          </SproutText>
        </View>
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
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
  groupsList: {
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
  friendsTeaserCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  teaserTitle: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
  teaserDesc: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
