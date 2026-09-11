import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
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
        size={36}
      />

      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <SproutText style={styles.name} numberOfLines={1}>
            {name} {isCurrentUser ? '(You)' : ''}
          </SproutText>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Crown size={10} color="#D8E8CB" style={{ marginRight: 3.5 }} />
              <SproutText style={styles.adminText}>
                Admin
              </SproutText>
            </View>
          )}
        </View>
        {email ? (
          <SproutText style={styles.email} numberOfLines={1}>
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
    minHeight: 55,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD7CC',
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#183228',
  },
  email: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#6D7C72',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#183228',
    borderRadius: radii.full,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    marginLeft: spacing.sm,
  },
  adminText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    letterSpacing: 0.3,
    color: '#D8E8CB',
  },
  removeBtn: {
    padding: 8,
  },
});
