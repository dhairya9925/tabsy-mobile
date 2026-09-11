import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { fontFamilies, spacing } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { FriendRecord } from '../types';
import { formatCurrencyExact } from '../utils/formatters';
import { Ghost, Check, X, Clock, UserMinus, ChevronRight } from 'lucide-react-native';

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

  const isSettled = Math.abs(netBalance) <= 0.01;
  const isOwed = netBalance > 0.01;

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
      disabled={mode !== 'friend' || !onPress}
      style={styles.card}
    >
      {/* Top Row: Avatar, Name & Actions */}
      <View style={styles.topRow}>
        <AvatarCircle name={name} email={email} size={38} />

        <View style={styles.infoCol}>
          <SproutText style={styles.name} numberOfLines={1}>
            {name}
          </SproutText>
          <SproutText style={styles.subtitle} numberOfLines={1}>
            {email || (isShadow ? 'Contact only' : 'Tabsy member')}
          </SproutText>
        </View>

        {/* Top Right Actions */}
        <View style={styles.topRightActions}>
          {mode === 'request' && (
            <View style={styles.requestActions}>
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#335C44" />
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onAccept}
                    style={styles.acceptBtn}
                    accessibilityLabel="Accept friend request"
                  >
                    <Check size={15} color="#2D523C" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onReject}
                    style={styles.rejectBtn}
                    accessibilityLabel="Reject friend request"
                  >
                    <X size={15} color="#AF4932" strokeWidth={2.5} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {mode === 'sent' && (
            <View style={styles.sentBadge}>
              <Clock size={11} color="#6B7A70" style={{ marginRight: 4 }} />
              <SproutText style={styles.sentBadgeText}>
                Pending
              </SproutText>
            </View>
          )}

          {mode === 'friend' && (
            <View style={styles.friendTopRight}>
              {onRemove && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleConfirmRemove}
                  style={styles.removeBtn}
                  accessibilityLabel="Remove friend"
                >
                  <UserMinus size={15} color="#8D9E92" strokeWidth={1.8} />
                </TouchableOpacity>
              )}
              {onPress && (
                <ChevronRight size={17} color="#8D9E92" strokeWidth={2} style={styles.chevron} />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Hairline Divider */}
      <View style={styles.divider} />

      {/* Bottom Row: Note on Left & Status / Settle on Right */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          {isShadow ? (
            <View style={styles.contactBadge}>
              <Ghost size={11} color="#6B7A70" style={{ marginRight: 4 }} />
              <SproutText style={styles.contactBadgeText}>
                Contact
              </SproutText>
            </View>
          ) : (
            <SproutText style={styles.descriptionText} numberOfLines={1}>
              {mode === 'friend'
                ? isSettled
                  ? 'All settled up'
                  : isOwed
                  ? 'Awaiting balance receipt'
                  : 'Pending your payment'
                : '1-on-1 sharing'}
            </SproutText>
          )}
        </View>

        {mode === 'friend' && (
          <View style={styles.bottomRight}>
            {netBalance < 0 && onSettleUp && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onSettleUp}
                style={styles.settleBtn}
              >
                <SproutText style={styles.settleBtnText}>
                  Settle Up
                </SproutText>
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.badgePill,
                isSettled
                  ? styles.badgeSettled
                  : isOwed
                  ? styles.badgeOwed
                  : styles.badgeOwes,
              ]}
            >
              <SproutText
                style={[
                  styles.badgeText,
                  isSettled
                    ? styles.badgeTextSettled
                    : isOwed
                    ? styles.badgeTextOwed
                    : styles.badgeTextOwes,
                ]}
              >
                {isSettled
                  ? 'Settled'
                  : isOwed
                  ? `+${formatCurrencyExact(netBalance)}`
                  : `-${formatCurrencyExact(Math.abs(netBalance))}`}
              </SproutText>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2EAE0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 10,
    paddingRight: spacing.xs,
  },
  name: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#183228',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#6B7A70',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    marginLeft: 2,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D8E8CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6DDD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF5ED',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2EAE0',
  },
  sentBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#6B7A70',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF3EC',
    marginVertical: 9,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomLeft: {
    flex: 1,
    paddingRight: 8,
  },
  descriptionText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#55685C',
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF5ED',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2EAE0',
  },
  contactBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#6B7A70',
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settleBtn: {
    backgroundColor: '#355E47',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 9,
  },
  settleBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSettled: {
    backgroundColor: '#E1EDE0',
  },
  badgeOwed: {
    backgroundColor: '#D8E8CB',
  },
  badgeOwes: {
    backgroundColor: '#F6DDD4',
  },
  badgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
  },
  badgeTextSettled: {
    color: '#2D523C',
  },
  badgeTextOwed: {
    color: '#235634',
  },
  badgeTextOwes: {
    color: '#AF4932',
  },
});


