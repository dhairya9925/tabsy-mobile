import { TextStyle } from 'react-native';
import { colors } from './tokens';

export const fontFamilies = {
  interface: 'Manrope',
  numeric: 'JetBrainsMono',
} as const;

export const typography: Record<string, TextStyle> = {
  eyebrow: {
    fontFamily: fontFamilies.interface,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  hero: {
    fontFamily: fontFamilies.interface,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -1.2,
    color: colors.text,
  },
  heroPace: {
    fontFamily: fontFamilies.interface,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.surface,
  },
  title: {
    fontFamily: fontFamilies.interface,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fontFamilies.interface,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.text,
  },
  body: {
    fontFamily: fontFamilies.interface,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
    color: colors.text,
  },
  bodyMuted: {
    fontFamily: fontFamilies.interface,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: colors.muted,
  },
  caption: {
    fontFamily: fontFamilies.interface,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: colors.muted,
  },
  button: {
    fontFamily: fontFamilies.interface,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.onAccent,
  },
  amount: {
    fontFamily: fontFamilies.numeric,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.text,
  },
  amountLarge: {
    fontFamily: fontFamilies.numeric,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  amountRow: {
    fontFamily: fontFamilies.numeric,
    fontSize: 16,
    fontWeight: '700',
    color: colors.negative,
  },
};
