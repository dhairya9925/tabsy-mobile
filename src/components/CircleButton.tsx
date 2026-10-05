import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, radii } from '../theme';

export interface CircleButtonProps {
  onPress?: () => void;
  icon: React.ReactNode;
  size?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const CircleButton: React.FC<CircleButtonProps> = ({
  onPress,
  icon,
  size = 44,
  backgroundColor,
  style,
  disabled,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const resolvedBg = backgroundColor ?? colors.surface;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: resolvedBg,
        },
        style,
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
});
