import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, statusColors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { AlertCircle, CheckCircle2, X } from 'lucide-react-native';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'error' | 'success' | 'info';
  onDismiss?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'error',
  onDismiss,
  duration = 4000,
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss?.());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
    }
  }, [visible, message]);

  if (!visible && !message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.text },
        isError && { backgroundColor: statusColors.negativeBg, borderColor: statusColors.negativeText },
        isSuccess && { backgroundColor: statusColors.positiveBg, borderColor: colors.positive },
        { opacity },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.iconWrapper}>
        {isError ? (
          <AlertCircle size={18} color={colors.negative} />
        ) : isSuccess ? (
          <CheckCircle2 size={18} color={colors.accent} />
        ) : null}
      </View>
      <SproutText
        variant="caption"
        color={isError ? statusColors.negativeText : isSuccess ? colors.positive : colors.text}
        weight="600"
        style={styles.message}
      >
        {message}
      </SproutText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.modal,
  },
  errorToast: {
    backgroundColor: statusColors.negativeBg,
    borderColor: statusColors.negativeText,
  },
  successToast: {
    backgroundColor: statusColors.positiveBg,
    borderColor: colors.positive,
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
  },
});
