import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { GroupMember } from '../types';
import { Crown, Trash2 } from 'lucide-react-native';

export interface GroupMemberRowProps {
  member: GroupMember;
  isCurrentUser?: boolean;
  canManage?: boolean;
  onRemove?: () => void;
}

export const GroupMemberRow: React.FC<GroupMemberRowProps> = ({
  member,
  isCurrentUser = false,
  canManage = false,
  onRemove,
}) => {
  const profile = member.profile;
  const name = profile?.display_name || profile?.email?.split('@')[0] || 'Member';
  const email = profile?.email || '';
  const isAdmin = member.role === 'admin';

  return (
    <View style={styles.container}>
      <AvatarCircle
        name={profile?.display_name}
        email={profile?.email}
        avatarUrl={profile?.avatar_url}
        size={40}
      />

      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1}>
            {name} {isCurrentUser ? '(You)' : ''}
          </SproutText>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Crown size={12} color={colors.accent} style={{ marginRight: 3 }} />
              <SproutText variant="caption" color={colors.accent} weight="700" style={styles.adminText}>
                Admin
              </SproutText>
            </View>
          )}
        </View>
        {email ? (
          <SproutText variant="caption" color={colors.muted} numberOfLines={1}>
            {email}
          </SproutText>
        ) : null}
      </View>

      {canManage && !isCurrentUser && onRemove && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRemove}
          style={styles.removeBtn}
        >
          <Trash2 size={16} color={colors.negative} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  adminText: {
    fontSize: 10,
  },
  removeBtn: {
    padding: 8,
  },
});
