import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { typography, colors, fontFamilies } from '../theme';

export interface SproutTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
}

const weightMap: Record<string, string> = {
  '400': fontFamilies.regular,
  '500': fontFamilies.medium,
  '600': fontFamilies.semiBold,
  '700': fontFamilies.bold,
  '800': fontFamilies.extraBold,
};

export const SproutText: React.FC<SproutTextProps> = ({
  children,
  variant = 'body',
  color,
  weight,
  style,
  ...rest
}) => {
  const variantStyle = typography[variant] || typography.body;
  const familyOverride = weight && weightMap[weight] ? { fontFamily: weightMap[weight] } : null;

  return (
    <RNText
      style={[
        variantStyle,
        familyOverride,
        color ? { color } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
