import { TextStyle } from 'react-native';
import { colors } from './tokens';

export const fontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  mono: 'JetBrainsMono_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  // Backward compatibility aliases
  interface: 'Manrope_400Regular',
  numeric: 'JetBrainsMono_700Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  eyebrow: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  hero: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1.4,
    color: colors.text,
  },
  heroPace: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 24,
    letterSpacing: -0.8,
    color: colors.surface,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  bodyMuted: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  button: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    letterSpacing: 0.2,
    color: colors.onAccent,
  },
  amount: {
    fontFamily: fontFamilies.mono,
    fontSize: 48,
    letterSpacing: -1,
    color: colors.text,
  },
  amountLarge: {
    fontFamily: fontFamilies.mono,
    fontSize: 36,
    color: colors.text,
  },
  amountRow: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.text,
  },
};
