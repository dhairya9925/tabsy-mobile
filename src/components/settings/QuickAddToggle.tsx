import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { radii, spacing, shadows, useTheme } from '../../theme';
import { SproutText } from '../SproutText';
import { useQuickAddStore } from '../../store/useQuickAddStore';
import { QuickAddModule } from '../../native/QuickAddModule';
import {
  Zap,
  Check,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';

export const QuickAddToggle: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const isEnabled = useQuickAddStore((s) => s.isEnabled);
  const isServiceRunning = useQuickAddStore((s) => s.isServiceRunning);
  const hasOverlayPermission = useQuickAddStore((s) => s.hasOverlayPermission);
  const hasNotificationPermission = useQuickAddStore((s) => s.hasNotificationPermission);
  const toggleService = useQuickAddStore((s) => s.toggleService);
  const checkPermissions = useQuickAddStore((s) => s.checkPermissions);
  const requestOverlayPermission = useQuickAddStore((s) => s.requestOverlayPermission);
  const requestNotificationPermission = useQuickAddStore((s) => s.requestNotificationPermission);

  const [isToggling, setIsToggling] = useState(false);
  const isAndroid = QuickAddModule.isSupported();

  // Re-check permissions when the app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isEnabled) {
        checkPermissions();
      }
    });
    return () => subscription.remove();
  }, [isEnabled, checkPermissions]);

  const handleToggle = async (value: boolean) => {
    setIsToggling(true);
    try {
      await toggleService(value);
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestOverlay = () => {
    navigation.navigate('QuickAddModal', { initialMode: 'text' });
  };

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Header Row: Icon + Title/Badge + Switch */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: isEnabled ? colors.accentSoft : colors.background }]}>
          <Zap size={18} color={isEnabled ? colors.accent : colors.muted} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.titleText}>
              Quick Add Notification
            </SproutText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isEnabled ? colors.accentSoft : colors.background },
              ]}
            >
              {isEnabled && (
                <Check size={10} color={colors.accent} strokeWidth={2.4} style={{ marginRight: 3 }} />
              )}
              <SproutText
                variant="caption"
                color={isEnabled ? colors.accent : colors.muted}
                weight="700"
                style={{ fontSize: 10 }}
              >
                {isEnabled ? 'ACTIVE' : 'OFF'}
              </SproutText>
            </View>
          </View>

          <SproutText variant="caption" color={colors.muted} style={styles.description}>
            Persistent status bar notification with quick Voice & Type actions
          </SproutText>
        </View>

        <View style={styles.switchWrap}>
          {isToggling ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.surface}
            />
          )}
        </View>
      </View>

      {/* Permission Warnings (Android only) */}
      {isAndroid && isEnabled && !hasNotificationPermission && (
        <View style={[styles.warningBanner, { backgroundColor: colors.background, borderColor: colors.line }]}>
          <AlertTriangle size={15} color={colors.negative} />
          <View style={{ flex: 1 }}>
            <SproutText variant="caption" color={colors.negative} weight="600">
              Notification permission needed
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
              Enable notifications to show the persistent quick add action bar.
            </SproutText>
          </View>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.accentSoft }]}
            onPress={requestNotificationPermission}
            activeOpacity={0.7}
          >
            <SproutText variant="caption" color={colors.accent} weight="700">
              Grant
            </SproutText>
          </TouchableOpacity>
        </View>
      )}

      {isAndroid && isEnabled && !hasOverlayPermission && (
        <View style={[styles.warningBanner, { backgroundColor: colors.background, borderColor: colors.line }]}>
          <AlertTriangle size={15} color={colors.sun} />
          <View style={{ flex: 1 }}>
            <SproutText variant="caption" color={colors.text} weight="600">
              Draw over apps permission
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
              Allows Quick Add popup to appear directly over other apps.
            </SproutText>
          </View>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.accentSoft }]}
            onPress={requestOverlayPermission}
            activeOpacity={0.7}
          >
            <SproutText variant="caption" color={colors.accent} weight="700">
              Settings
            </SproutText>
            <ExternalLink size={11} color={colors.accent} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Action / Test Row */}
      <View style={[styles.bottomRow, { borderTopColor: colors.line }]}>
        <TouchableOpacity
          style={[styles.testBtn, { backgroundColor: colors.background }]}
          onPress={handleTestOverlay}
          activeOpacity={0.7}
        >
          <Sparkles size={14} color={colors.accent} style={{ marginRight: 6 }} />
          <SproutText variant="caption" color={colors.accent} weight="700">
            Test Quick Add Popup
          </SproutText>
        </TouchableOpacity>

        {isAndroid && isServiceRunning && (
          <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
            Foreground service running
          </SproutText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.md + 2,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
    paddingRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  titleText: {
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  description: {
    lineHeight: 16,
    marginTop: 2,
  },
  switchWrap: {
    alignSelf: 'center',
    marginLeft: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.xs + 4,
    marginTop: spacing.sm,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
    paddingTop: spacing.xs + 4,
    borderTopWidth: 1,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.md,
  },
});

