import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { networkService } from '../services/offline/networkService';
import { outboxService } from '../services/offline/outboxService';
import { SproutText } from './SproutText';
import { radii, spacing, useTheme } from '../theme';
import { WifiOff, RefreshCw, CheckCircle2, X, CloudOff, AlertCircle, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../utils/haptics';
import { OutboxAction } from '../types/offline';

export const OfflineSyncBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDark } = useTheme();

  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());
  const [pendingCount, setPendingCount] = useState<number>(outboxService.getPendingCount());
  const [pendingActions, setPendingActions] = useState<OutboxAction[]>(outboxService.getQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncedSuccess, setShowSyncedSuccess] = useState<boolean>(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const prevOnlineRef = useRef<boolean>(networkService.isOnline());
  const prevPendingCountRef = useRef<number>(outboxService.getPendingCount());
  const prevSyncingRef = useRef<boolean>(false);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Trigger temporary subtle notification expansion (e.g. for 3.8s)
  const triggerSubtleNotification = useCallback(() => {
    setIsNotificationVisible(true);
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(() => {
      setIsNotificationVisible(false);
    }, 3800);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    const unsubNet = networkService.subscribe((online) => {
      setIsOnline(online);

      // Detect transition from online -> offline
      if (prevOnlineRef.current && !online) {
        triggerSubtleNotification();
      }
      prevOnlineRef.current = online;
    });

    const unsubOutbox = outboxService.subscribe((queue, syncing) => {
      const count = queue.length;
      setPendingCount(count);
      setPendingActions(queue);
      setIsSyncing(syncing);

      // Detect newly saved changes while offline
      if (count > prevPendingCountRef.current && !networkService.isOnline()) {
        triggerSubtleNotification();
      }
      prevPendingCountRef.current = count;

      // Detect transition from syncing -> finished with 0 pending
      if (prevSyncingRef.current && !syncing && count === 0) {
        setShowSyncedSuccess(true);
        setTimeout(() => {
          setShowSyncedSuccess(false);
        }, 3000);
      }
      prevSyncingRef.current = syncing;
    });

    return () => {
      unsubNet();
      unsubOutbox();
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, [triggerSubtleNotification, fadeAnim]);

  // Continuous rotation while syncing
  useEffect(() => {
    if (isSyncing) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => {
        loop.stop();
        spinAnim.setValue(0);
      };
    } else {
      spinAnim.setValue(0);
    }
  }, [isSyncing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOpenDetails = () => {
    haptics.selection();
    setSyncFeedback(null);
    setPendingActions(outboxService.getQueue());
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSyncFeedback(null);
  };

  const handleManualSync = async () => {
    haptics.impact('light');
    if (!networkService.isOnline()) {
      setSyncFeedback('Still offline. Changes will automatically sync once your internet connection returns.');
      return;
    }

    try {
      setSyncFeedback(null);
      const res = await outboxService.processQueue();
      const remaining = outboxService.getPendingCount();
      setPendingCount(remaining);
      setPendingActions(outboxService.getQueue());

      if (remaining === 0) {
        setSyncFeedback('All changes successfully synced!');
      } else if (res.errors && res.errors.length > 0) {
        setSyncFeedback(`Sync failed: ${res.errors[0].error}`);
      } else {
        setSyncFeedback(`${remaining} item(s) remaining in queue.`);
      }
    } catch (e: any) {
      setSyncFeedback(e.message || 'Sync failed. Will retry automatically.');
    }
  };

  const handleDiscardItem = async (actionId: string) => {
    haptics.impact('medium');
    await outboxService.remove(actionId);
    const updated = outboxService.getQueue();
    setPendingCount(updated.length);
    setPendingActions(updated);
    setSyncFeedback('Item discarded.');
  };

  // If online, not syncing, and no success notification or pending items, hide
  const shouldRenderIndicator = !isOnline || isSyncing || showSyncedSuccess || pendingCount > 0;
  if (!shouldRenderIndicator && !showDetailsModal) {
    return null;
  }

  // True offline styles (peach / warm clay)
  const offlineBg = isDark ? 'rgba(36, 40, 36, 0.94)' : 'rgba(255, 245, 240, 0.96)';
  const offlineBorder = isDark ? 'rgba(244, 164, 138, 0.35)' : '#F0C4B4';
  const offlineIconColor = isDark ? '#F4A48A' : '#8D3C25';
  const offlineTextColor = isDark ? '#F0F6F2' : '#7A3E2D';

  // Online with pending changes styles (sage / forest / amber accent)
  const pendingBg = isDark ? 'rgba(26, 42, 34, 0.94)' : 'rgba(240, 248, 242, 0.96)';
  const pendingBorder = isDark ? 'rgba(120, 207, 157, 0.35)' : '#C2E2CE';
  const pendingIconColor = isDark ? '#78CF9D' : '#1E643E';
  const pendingTextColor = isDark ? '#F0F6F2' : '#183228';

  // Active theme based on connection state
  const isActuallyOffline = !isOnline;
  const currentBg = isActuallyOffline ? offlineBg : pendingBg;
  const currentBorder = isActuallyOffline ? offlineBorder : pendingBorder;
  const currentIconColor = isActuallyOffline ? offlineIconColor : pendingIconColor;
  const currentTextColor = isActuallyOffline ? offlineTextColor : pendingTextColor;

  const syncingBg = isDark ? 'rgba(24, 38, 30, 0.94)' : 'rgba(235, 246, 238, 0.96)';
  const syncingBorder = isDark ? 'rgba(100, 175, 135, 0.4)' : '#C4E4D0';
  const syncingIconColor = isDark ? '#78CF9D' : '#1E643E';

  const successBg = isDark ? 'rgba(24, 45, 32, 0.96)' : '#D8E8CB';
  const successBorder = isDark ? 'rgba(120, 207, 157, 0.45)' : '#B8DC9F';

  // First item with an error (if any)
  const failedItem = pendingActions.find((a) => !!a.lastError);

  return (
    <>
      {/* Floating subtle indicator button centered just below the status bar */}
      {shouldRenderIndicator && (
        <Animated.View
          style={[
            styles.floatingContainer,
            {
              top: Math.max(insets.top + 6, 12),
              opacity: fadeAnim,
            },
          ]}
          pointerEvents="box-none"
        >
          {showSyncedSuccess ? (
            // Success Pill
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenDetails}
              style={[styles.pillButton, { backgroundColor: successBg, borderColor: successBorder }]}
              accessibilityLabel="Sync succeeded"
            >
              <CheckCircle2 size={13} color={isDark ? '#78CF9D' : '#183228'} strokeWidth={2.4} style={styles.iconSpacing} />
              <SproutText style={[styles.pillText, { color: isDark ? '#F0F6F2' : '#183228' }]} weight="700">
                All changes synced
              </SproutText>
            </TouchableOpacity>
          ) : isSyncing ? (
            // Syncing Pill
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenDetails}
              style={[styles.pillButton, { backgroundColor: syncingBg, borderColor: syncingBorder }]}
              accessibilityLabel="Sync in progress"
            >
              <Animated.View style={[styles.iconSpacing, { transform: [{ rotate: spin }] }]}>
                <RefreshCw size={13} color={syncingIconColor} strokeWidth={2.2} />
              </Animated.View>
              <SproutText style={[styles.pillText, { color: isDark ? '#F0F6F2' : syncingIconColor }]} weight="700">
                Syncing {pendingCount > 0 ? `${pendingCount}...` : '...'}
              </SproutText>
            </TouchableOpacity>
          ) : isNotificationVisible ? (
            // Subtle Expanded Notification
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenDetails}
              style={[styles.pillButton, { backgroundColor: currentBg, borderColor: currentBorder }]}
              accessibilityLabel="Connection and sync status, tap to view details"
            >
              {isActuallyOffline ? (
                <WifiOff size={14} color={currentIconColor} strokeWidth={2.2} style={styles.iconSpacing} />
              ) : (
                <RefreshCw size={13} color={currentIconColor} strokeWidth={2.2} style={styles.iconSpacing} />
              )}
              <SproutText style={[styles.pillText, { color: currentTextColor }]} weight="700">
                {isActuallyOffline
                  ? pendingCount > 0
                    ? `Offline · ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} saved locally`
                    : 'Offline mode · Viewing saved data'
                  : `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} pending sync`}
              </SproutText>
            </TouchableOpacity>
          ) : (
            // Subtle Persistent Button (compact default state)
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleOpenDetails}
              style={[
                styles.iconButton,
                { backgroundColor: currentBg, borderColor: currentBorder },
                pendingCount > 0 && styles.iconButtonWithBadge,
              ]}
              accessibilityLabel={isActuallyOffline ? 'Offline indicator' : 'Pending sync indicator'}
            >
              {isActuallyOffline ? (
                // When truly offline: always show WifiOff ("wifi with a slash")
                <WifiOff size={14} color={currentIconColor} strokeWidth={2.2} />
              ) : (
                // When online with pending changes: show sync icon (NOT WifiOff)
                <RefreshCw size={13} color={currentIconColor} strokeWidth={2.2} />
              )}
              {pendingCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isActuallyOffline
                        ? isDark ? 'rgba(244, 164, 138, 0.25)' : '#FADBD0'
                        : isDark ? 'rgba(120, 207, 157, 0.25)' : '#D0EBD8',
                    },
                  ]}
                >
                  <SproutText style={[styles.badgeText, { color: currentIconColor }]} weight="800">
                    {pendingCount}
                  </SproutText>
                </View>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDetails}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseDetails}
          />

          <View
            style={[
              styles.dialogCard,
              {
                backgroundColor: themeColors.surfaceElevated || themeColors.surface,
                borderColor: themeColors.line,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconWrap,
                  {
                    backgroundColor: isActuallyOffline
                      ? isDark ? 'rgba(244, 164, 138, 0.15)' : '#FDE8E0'
                      : isDark ? 'rgba(120, 207, 157, 0.15)' : '#E0F3E6',
                  },
                ]}
              >
                {isActuallyOffline ? (
                  <WifiOff size={18} color={offlineIconColor} strokeWidth={2.2} />
                ) : (
                  <RefreshCw size={17} color={pendingIconColor} strokeWidth={2.2} />
                )}
              </View>
              <View style={styles.modalHeaderText}>
                <SproutText variant="title" color={themeColors.text} weight="700">
                  {isActuallyOffline ? 'Offline Mode' : 'Sync Pending'}
                </SproutText>
                <SproutText variant="caption" color={themeColors.muted}>
                  {isOnline ? 'Online · Internet connected' : 'Offline · No internet connection'}
                </SproutText>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCloseDetails}
                style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                accessibilityLabel="Close details"
              >
                <X size={16} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            {/* Connection Status Section */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.line,
                },
              ]}
            >
              <View style={styles.statusDotRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? '#22C55E' : '#E88B73' },
                  ]}
                />
                <SproutText variant="body" color={themeColors.text} weight="600">
                  {isOnline ? 'Internet connection available' : 'No internet connection'}
                </SproutText>
              </View>
              <SproutText variant="caption" color={themeColors.muted} style={{ marginTop: 4 }}>
                {isOnline
                  ? 'Your app is online and can reach Tabsy servers.'
                  : 'Tabsy continues working seamlessly. You can record expenses and view recent transactions.'}
              </SproutText>
            </View>

            {/* Pending Outbox Queue Section */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.line,
                },
              ]}
            >
              <View style={styles.outboxHeaderRow}>
                <CloudOff size={16} color={pendingCount > 0 ? (isActuallyOffline ? offlineIconColor : pendingIconColor) : themeColors.muted} />
                <SproutText variant="body" color={themeColors.text} weight="700">
                  {pendingCount > 0
                    ? `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} saved locally`
                    : 'All changes synced'}
                </SproutText>
              </View>
              <SproutText variant="caption" color={themeColors.muted} style={{ marginTop: 4 }}>
                {pendingCount > 0
                  ? isOnline
                    ? 'Changes were saved offline and are ready to be sent to your account.'
                    : 'Expenses and updates you make while offline are queued safely on this device. They will automatically upload as soon as internet is restored.'
                  : 'There are no pending offline changes waiting to sync.'}
              </SproutText>
            </View>

            {/* If a previous sync failed with an error, show it clearly */}
            {failedItem && failedItem.lastError && (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <AlertCircle size={14} color="#EF4444" />
                  <SproutText variant="caption" color="#EF4444" weight="700">
                    Sync Error
                  </SproutText>
                </View>
                <SproutText variant="caption" color={themeColors.text} style={{ fontSize: 11, marginBottom: 8 }}>
                  {failedItem.lastError}
                </SproutText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDiscardItem(failedItem.id)}
                  style={styles.discardBtn}
                >
                  <Trash2 size={12} color="#EF4444" style={{ marginRight: 4 }} />
                  <SproutText variant="caption" color="#EF4444" weight="700">
                    Discard invalid entry
                  </SproutText>
                </TouchableOpacity>
              </View>
            )}

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderColor: themeColors.line,
                  },
                ]}
              >
                <SproutText variant="caption" color={themeColors.text} weight="600" style={{ textAlign: 'center' }}>
                  {syncFeedback}
                </SproutText>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              {pendingCount > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleManualSync}
                  disabled={isSyncing}
                  style={[
                    styles.syncBtn,
                    { backgroundColor: themeColors.accent },
                    isSyncing && { opacity: 0.7 },
                  ]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  ) : (
                    <RefreshCw size={14} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
                  )}
                  <SproutText variant="body" color="#FFFFFF" weight="700">
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </SproutText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCloseDetails}
                style={[
                  styles.dismissBtn,
                  pendingCount > 0
                    ? { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                    : { backgroundColor: themeColors.accent, flex: 1 },
                ]}
              >
                <SproutText
                  variant="body"
                  color={pendingCount > 0 ? themeColors.text : '#FFFFFF'}
                  weight="700"
                >
                  {pendingCount > 0 ? 'Close' : 'Got it'}
                </SproutText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 8,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  iconButtonWithBadge: {
    width: 'auto',
    paddingHorizontal: 8,
    gap: 4,
  },
  iconSpacing: {
    marginRight: 6,
  },
  pillText: {
    fontSize: 11,
    lineHeight: 14,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.full,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  modalHeaderText: {
    flex: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
  },
  errorCard: {
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  outboxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackBanner: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radii.lg,
  },
  dismissBtn: {
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
