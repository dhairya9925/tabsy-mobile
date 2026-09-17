import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fontFamilies, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { groupsApi } from '../api/groups';
import { X, Copy, Check, Share2 } from 'lucide-react-native';

export interface ShareGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  inviteCode?: string | null;
}

export const ShareGroupSheet: React.FC<ShareGroupSheetProps> = ({
  visible,
  onClose,
  groupId,
  groupName,
  inviteCode,
}) => {
  const [resolvedCode, setResolvedCode] = useState<string | null>(inviteCode?.trim() || null);
  const [resolvedName, setResolvedName] = useState<string>(
    groupName && groupName !== 'Group' ? groupName : ''
  );
  const [isFetchingGroup, setIsFetchingGroup] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync if parent updates props
  useEffect(() => {
    if (inviteCode && inviteCode.trim()) {
      setResolvedCode(inviteCode.trim());
    }
    if (groupName && groupName !== 'Group') {
      setResolvedName(groupName);
    }
  }, [inviteCode, groupName]);

  // Self-healing fetch if invite code or group name was not yet loaded
  useEffect(() => {
    if (visible && (!resolvedCode || !resolvedName)) {
      setIsFetchingGroup(true);
      groupsApi
        .getGroup(groupId)
        .then((g) => {
          if (g.invite_code) setResolvedCode(g.invite_code);
          if (g.name) setResolvedName(g.name);
        })
        .catch(() => {})
        .finally(() => setIsFetchingGroup(false));
    }
  }, [visible, groupId, resolvedCode, resolvedName]);

  const displayCode = resolvedCode || (inviteCode && inviteCode.trim()) || groupId;
  const displayName = resolvedName || (groupName && groupName !== 'Group' ? groupName : 'Group');
  const inviteLink = `https://tabsy.app/join/${displayCode}`;

  const handleCopyCode = async () => {
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(displayCode);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(displayCode);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(displayCode);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch {
          // Ignore copy failures
        }
      }
    }
  };

  const handleShareLink = async () => {
    const shareMessage = `Join our group "${displayName}" on Tabsy!\n\nLink: ${inviteLink}\nGroup Code: ${displayCode}`;
    try {
      await Share.share(
        Platform.select({
          ios: {
            title: `Join ${displayName} on Tabsy`,
            message: shareMessage,
            url: inviteLink,
          },
          default: {
            title: `Join ${displayName} on Tabsy`,
            message: shareMessage,
          },
        })!
      );
    } catch {
      // Share dialog dismissed or cancelled
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dimmed Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Signature Sprout Card styled exactly like the Group Balance Banner */}
        <View style={styles.bannerCard}>
          {/* Top Row: "Clear between friends" on left & close circular button on right */}
          <View style={styles.topRow}>
            <SproutText style={styles.eyebrow}>
              Clear between friends
            </SproutText>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={styles.closeCircleBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={15} color="#183228" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Title Row: Group Name */}
          <View style={styles.titleRow}>
            <SproutText style={styles.groupName} numberOfLines={1}>
              {displayName}
            </SproutText>
          </View>

          {/* Subtitle */}
          <SproutText style={styles.description} numberOfLines={2}>
            Share group invite code or link with friends
          </SproutText>

          {/* Inner Highlighted Code Box (Floating clean white surface) */}
          <View style={styles.codeCard}>
            <View style={styles.codeLeft}>
              <SproutText style={styles.codeLabel}>
                GROUP INVITE CODE
              </SproutText>
              {isFetchingGroup && !resolvedCode ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color="#183228" />
                </View>
              ) : (
                <SproutText style={styles.codeValue}>
                  {displayCode}
                </SproutText>
              )}
            </View>
            <TouchableOpacity
              style={styles.codeCopyBtn}
              activeOpacity={0.75}
              onPress={handleCopyCode}
              accessibilityRole="button"
              accessibilityLabel="Copy group code"
            >
              {isCopied ? (
                <Check size={16} color="#D8E8CB" strokeWidth={2.8} />
              ) : (
                <Copy size={16} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Single Primary Action: Share Invite Link (sends link + code together) */}
          <TouchableOpacity
            style={styles.shareBtn}
            activeOpacity={0.85}
            onPress={handleShareLink}
            accessibilityRole="button"
            accessibilityLabel="Share invite link"
          >
            <Share2 size={17} color="#D8E8CB" strokeWidth={2.4} />
            <SproutText style={styles.shareBtnText}>
              Share Invite Link
            </SproutText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Export alias for popup naming
export const ShareGroupPopup = ShareGroupSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 38, 28, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#D8E8CB', // Sprout signature banner sage green
    borderTopLeftRadius: 28,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 20,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#536D5B',
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleRow: {
    marginTop: 2,
    marginBottom: 3,
  },
  groupName: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: '#183228',
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#536D5B',
    marginBottom: 16,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  codeLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  codeLabel: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 9.5,
    letterSpacing: 0.9,
    color: '#536D5B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  codeValue: {
    fontFamily: fontFamilies.mono,
    letterSpacing: 2.5,
    fontSize: 21,
    fontWeight: '800',
    color: '#183228',
  },
  loadingWrap: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  codeCopyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#183228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#183228', // Signature Sprout deep forest green
    height: 48,
    borderRadius: radii.full,
    shadowColor: '#183228',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  shareBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});
