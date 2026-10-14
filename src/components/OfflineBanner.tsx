import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, StyleProp, ViewStyle } from 'react-native';
import { WifiOff, ChevronRight } from 'lucide-react-native';
import { networkService } from '../services/offline/networkService';
import { SproutText } from './SproutText';
import { colors, fontFamilies, radii, spacing, useTheme } from '../theme';

export interface OfflineBannerProps {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  message?: string;
  showAction?: boolean;
  actionText?: string;
  onActionPress?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  compact = false,
  style,
  message = 'Offline mode · Changes saved locally & will sync automatically',
  showAction = false,
  actionText = 'View details',
  onActionPress,
}) => {
  const { isDark } = useTheme();
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());
  const fadeAnim = useRef(new Animated.Value(networkService.isOnline() ? 0 : 1)).current;

  useEffect(() => {
    return networkService.subscribe((online) => {
      setIsOnline(online);
      Animated.timing(fadeAnim, {
        toValue: online ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  if (isOnline) {
    return null;
  }

  const bgColor = isDark ? 'rgba(38, 42, 38, 0.95)' : 'rgba(255, 245, 240, 0.98)';
  const borderColor = isDark ? 'rgba(244, 164, 138, 0.35)' : '#F0C4B4';
  const textColor = isDark ? '#F4A48A' : '#7A3E2D';
  const iconColor = isDark ? '#F4A48A' : '#8D3C25';

  return (
    <Animated.View
      style={[
        styles.container,
        compact ? styles.containerCompact : styles.containerFull,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: fadeAnim,
        },
        style,
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconWrapper}>
          <WifiOff size={compact ? 13 : 15} color={iconColor} strokeWidth={2.2} />
        </View>

        <SproutText
          variant="caption"
          style={[styles.messageText, { color: textColor }]}
          numberOfLines={compact ? 1 : 2}
        >
          {message}
        </SproutText>

        {showAction && onActionPress && (
          <TouchableOpacity
            onPress={onActionPress}
            style={styles.actionBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <SproutText variant="caption" weight="700" style={[styles.actionText, { color: textColor }]}>
              {actionText}
            </SproutText>
            <ChevronRight size={13} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.md,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  containerFull: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  containerCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    marginRight: 2,
  },
});
