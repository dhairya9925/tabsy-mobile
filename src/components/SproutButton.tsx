import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { SproutText } from './SproutText';

export interface SproutButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'clay' | 'soft';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const SproutButton: React.FC<SproutButtonProps> = ({
  label,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...rest
}) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isClay = variant === 'clay';
  const isSoft = variant === 'soft';

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    isPrimary && styles.primary,
    isOutline && styles.outline,
    isClay && styles.clay,
    isSoft && styles.soft,
    variant === 'ghost' && styles.ghost,
    (disabled || isLoading) && styles.disabled,
    style,
  ];

  let textColor: string = colors.onAccent;
  if (isOutline || variant === 'ghost') textColor = colors.accent;
  if (isClay) textColor = colors.text;
  if (isSoft) textColor = colors.text;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled || isLoading}
      style={containerStyle}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <SproutText
            variant="button"
            color={textColor}
            style={[
              leftIcon ? { marginLeft: spacing.sm } : null,
              rightIcon ? { marginRight: spacing.sm } : null,
            ]}
          >
            {label}
          </SproutText>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  clay: {
    backgroundColor: colors.clay,
  },
  soft: {
    backgroundColor: colors.soft,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
});
