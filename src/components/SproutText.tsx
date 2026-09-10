import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { typography, colors } from '../theme';

export interface SproutTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
}

export const SproutText: React.FC<SproutTextProps> = ({
  children,
  variant = 'body',
  color,
  weight,
  style,
  ...rest
}) => {
  const variantStyle = typography[variant] || typography.body;

  return (
    <RNText
      style={[
        variantStyle,
        color ? { color } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
