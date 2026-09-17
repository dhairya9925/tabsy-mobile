import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { typography, colors, fontFamilies } from '../theme';

export interface SproutTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
}

const getWeightFamily = (weight?: '400' | '500' | '600' | '700' | '800') => {
  if (!weight) return undefined;
  switch (weight) {
    case '400': return fontFamilies.regular;
    case '500': return fontFamilies.medium;
    case '600': return fontFamilies.semiBold;
    case '700': return fontFamilies.bold;
    case '800': return fontFamilies.extraBold;
    default: return undefined;
  }
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
  const family = getWeightFamily(weight);
  const familyOverride = family ? { fontFamily: family } : null;

  const flatStyle = StyleSheet.flatten(style);
  const effectiveFontSize = flatStyle?.fontSize || variantStyle.fontSize;
  const currentLineHeight = flatStyle?.lineHeight ?? variantStyle.lineHeight;

  let safeLineHeightOverride: { lineHeight?: number } | null = null;
  if (effectiveFontSize && currentLineHeight && currentLineHeight < effectiveFontSize) {
    safeLineHeightOverride = { lineHeight: Math.round(effectiveFontSize * 1.25) };
  }

  return (
    <RNText
      style={[
        variantStyle,
        familyOverride,
        color ? { color } : null,
        style,
        safeLineHeightOverride,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
