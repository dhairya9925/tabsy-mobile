import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { networkService } from '../services/offline/networkService';
import { outboxService } from '../services/offline/outboxService';
import { SproutText } from './SproutText';
import { colors, radii, spacing, fontFamilies } from '../theme';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());
  const [pendingCount, setPendingCount] = useState<number>(outboxService.getPendingCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncedSuccess, setShowSyncedSuccess] = useState<boolean>(false);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const prevSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    const unsubNet = networkService.subscribe((online) => {
      setIsOnline(online);
    });

    const unsubOutbox = outboxService.subscribe((queue, syncing) => {
      setPendingCount(queue.length);
      setIsSyncing(syncing);

      // Detect transition from syncing -> finished with 0 pending
      if (prevSyncingRef.current && !syncing && queue.length === 0) {
        setShowSyncedSuccess(true);
        setTimeout(() => {
          setShowSyncedSuccess(false);
        }, 3500);
      }
      prevSyncingRef.current = syncing;
    });

    return () => {
      unsubNet();
      unsubOutbox();
    };
  }, []);

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

  // If online, not syncing, and no success notification, hide banner
  if (isOnline && !isSyncing && !showSyncedSuccess && pendingCount === 0) {
    return null;
  }

  // 1. Synced Success State
  if (showSyncedSuccess) {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <CheckCircle2 size={13} color="#183228" strokeWidth={2.4} style={styles.icon} />
        <SproutText style={styles.textSuccess} weight="700">
          All changes synced with server
        </SproutText>
      </View>
    );
  }

  // 2. Syncing State
  if (isSyncing) {
    return (
      <View style={[styles.banner, styles.bannerSyncing]}>
        <Animated.View style={[styles.icon, { transform: [{ rotate: spin }] }]}>
          <RefreshCw size={13} color="#183228" strokeWidth={2.2} />
        </Animated.View>
        <SproutText style={styles.textSyncing} weight="700">
          Syncing {pendingCount} offline {pendingCount === 1 ? 'item' : 'items'}...
        </SproutText>
      </View>
    );
  }

  // 3. Offline Mode State
  return (
    <View style={[styles.banner, styles.bannerOffline]}>
      <WifiOff size={13} color="#7A3E2D" strokeWidth={2.2} style={styles.icon} />
      <SproutText style={styles.textOffline} weight="700">
        {pendingCount > 0
          ? `Offline · ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} saved locally`
          : 'Offline mode · Viewing saved data'}
      </SproutText>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
  },
  icon: {
    marginRight: 6,
  },
  bannerOffline: {
    backgroundColor: '#F4DACD', // Soft clay/peach
  },
  textOffline: {
    fontSize: 11,
    color: '#7A3E2D',
  },
  bannerSyncing: {
    backgroundColor: '#D8E8CB', // Soft sage
  },
  textSyncing: {
    fontSize: 11,
    color: '#183228',
  },
  bannerSuccess: {
    backgroundColor: '#D8E8CB', // Soft sage
  },
  textSuccess: {
    fontSize: 11,
    color: '#183228',
  },
});
