import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, shadows } from '../../theme';
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

  const isEnabled = useQuickAddStore((s) => s.isEnabled);
  const isServiceRunning = useQuickAddStore((s) => s.isServiceRunning);
  const hasOverlayPermission = useQuickAddStore((s) => s.hasOverlayPermission);
  const hasNotificationPermission = useQuickAddStore((s) => s.hasNotificationPermission);
  const isCheckingPermissions = useQuickAddStore((s) => s.isCheckingPermissions);
  const toggleService = useQuickAddStore((s) => s.toggleService);
  const requestOverlayPermission = useQuickAddStore((s) => s.requestOverlayPermission);
  const requestNotificationPermission = useQuickAddStore((s) => s.requestNotificationPermission);

  const [isToggling, setIsToggling] = useState(false);
  const isAndroid = QuickAddModule.isSupported();

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
    <View style={[styles.card, shadows.card]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: isEnabled ? colors.accentSoft : colors.background }]}>
            <Zap size={18} color={isEnabled ? colors.accent : colors.muted} />
          </View>
          <View>
            <View style={styles.titleBadgeRow}>
              <SproutText variant="subtitle" color={colors.text} weight="700">
                Quick Add Notification
              </SproutText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isEnabled ? colors.accentSoft : colors.background },
                ]}
              >
                {isEnabled && (
                  <Check size={10} color={colors.accent} style={{ marginRight: 3 }} />
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
            <SproutText variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
              Persistent status bar notification with quick Voice & Type actions
            </SproutText>
          </View>
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
        <View style={styles.warningBanner}>
          <AlertTriangle size={15} color={colors.negative} />
          <View style={{ flex: 1 }}>
            <SproutText variant="caption" color={colors.negative} weight="600">
              Notification permission needed
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
              Enable notifications to show the persistent quick add action bar.
            </SproutText>
          </View>
          <TouchableOpacity
            style={styles.permissionBtn}
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
        <View style={styles.warningBanner}>
          <AlertTriangle size={15} color={colors.sun} />
          <View style={{ flex: 1 }}>
            <SproutText variant="caption" color={colors.text} weight="600">
              Draw over apps permission
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
              Allows Quick Add popup to appear directly over other apps.
            </SproutText>
          </View>
          <TouchableOpacity
            style={styles.permissionBtn}
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
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.testBtn}
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
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderColor: colors.line,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  switchWrap: {
    paddingTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.background,
    borderColor: colors.line,
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
    backgroundColor: colors.accentSoft,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
});
