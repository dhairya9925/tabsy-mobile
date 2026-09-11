import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { FriendRecord } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import { Ghost, Check, X, Clock, UserMinus } from 'lucide-react-native';

interface FriendCardProps {
  friend: FriendRecord;
  currentUserId?: string;
  netBalance?: number;
  mode?: 'friend' | 'request' | 'sent';
  isActionLoading?: boolean;
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onSettleUp?: () => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  currentUserId,
  netBalance = 0,
  mode = 'friend',
  isActionLoading = false,
  onPress,
  onAccept,
  onReject,
  onRemove,
  onSettleUp,
}) => {
  const profile = friend.profile;
  const name = profile?.display_name || profile?.email || 'Unknown';
  const email = profile?.email || '';
  const isShadow = !!profile?.is_shadow;

  const handleConfirmRemove = () => {
    Alert.alert(
      'Remove Friend?',
      `Are you sure you want to remove ${name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={mode === 'friend' && onPress ? 0.82 : 1}
      onPress={mode === 'friend' ? onPress : undefined}
      style={styles.card}
    >
      <View style={styles.leftRow}>
        <AvatarCircle name={name} size={42} />

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <SproutText variant="subtitle" color={colors.text} numberOfLines={1} style={styles.name}>
              {name}
            </SproutText>
            {isShadow && (
              <View style={styles.contactBadge}>
                <Ghost size={11} color={colors.muted} style={{ marginRight: 3 }} />
                <SproutText variant="caption" color={colors.muted} weight="600">
                  Contact
                </SproutText>
              </View>
            )}
          </View>

          {email ? (
            <SproutText variant="caption" color={colors.muted} numberOfLines={1}>
              {email}
            </SproutText>
          ) : null}

          {mode === 'friend' && (
            <View style={styles.balanceRow}>
              {netBalance > 0 ? (
                <SproutText variant="caption" color={colors.accent} weight="700">
                  Owes you {formatCurrencyExact(netBalance)}
                </SproutText>
              ) : netBalance < 0 ? (
                <SproutText variant="caption" color={colors.negative} weight="700">
                  You owe {formatCurrencyExact(Math.abs(netBalance))}
                </SproutText>
              ) : (
                <SproutText variant="caption" color={colors.muted} weight="600">
                  Settled up
                </SproutText>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons based on mode */}
      <View style={styles.actionsRight}>
        {mode === 'request' && (
          <View style={styles.requestActions}>
            {isActionLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onAccept}
                  style={styles.acceptBtn}
                  accessibilityLabel="Accept friend request"
                >
                  <Check size={16} color={colors.accent} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onReject}
                  style={styles.rejectBtn}
                  accessibilityLabel="Reject friend request"
                >
                  <X size={16} color={colors.negative} strokeWidth={2.5} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {mode === 'sent' && (
          <View style={styles.sentBadge}>
            <Clock size={12} color={colors.muted} style={{ marginRight: 4 }} />
            <SproutText variant="caption" color={colors.muted} weight="600">
              Pending
            </SproutText>
          </View>
        )}

        {mode === 'friend' && (
          <View style={styles.friendActions}>
            {netBalance < 0 && onSettleUp && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onSettleUp}
                style={styles.settleBtn}
              >
                <SproutText variant="caption" color={colors.onAccent} weight="700">
                  Settle Up
                </SproutText>
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleConfirmRemove}
                style={styles.removeBtn}
                accessibilityLabel="Remove friend"
              >
                <UserMinus size={16} color={colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 68,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  infoCol: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontWeight: '700',
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  balanceRow: {
    marginTop: 3,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settleBtn: {
    backgroundColor: colors.accent,
    minHeight: 40,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radii.full,
  },
  removeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
