import { TextStyle } from 'react-native';
import { colors } from './tokens';

export interface TypographyPresetConfig {
  id: string;
  name: string;
  description: string;
  sample: string;
  fontFamilies: {
    regular?: string;
    medium?: string;
    semiBold?: string;
    bold?: string;
    extraBold?: string;
    mono?: string;
    monoRegular?: string;
    interface?: string;
    numeric?: string;
  };
}

export const TYPOGRAPHY_PRESETS = {
  manrope: {
    id: 'manrope',
    name: 'Manrope (Sprout standard)',
    description: 'Humanist geometric sans-serif for everyday balance',
    sample: '₹18,640.00 · Daily Rhythm',
    fontFamilies: {
      regular: 'Manrope_400Regular',
      medium: 'Manrope_500Medium',
      semiBold: 'Manrope_600SemiBold',
      bold: 'Manrope_700Bold',
      extraBold: 'Manrope_800ExtraBold',
      mono: 'Manrope_700Bold',
      monoRegular: 'Manrope_400Regular',
      interface: 'Manrope_400Regular',
      numeric: 'Manrope_700Bold',
    },
  },
  mono: {
    id: 'mono',
    name: 'JetBrains Mono (Numeric focus)',
    description: 'Editorial monospaced numerals for financial clarity',
    sample: '₹18,640.00 · Precision Ledger',
    fontFamilies: {
      regular: 'JetBrainsMono_400Regular',
      medium: 'JetBrainsMono_400Regular',
      semiBold: 'JetBrainsMono_700Bold',
      bold: 'JetBrainsMono_700Bold',
      extraBold: 'JetBrainsMono_700Bold',
      mono: 'JetBrainsMono_700Bold',
      monoRegular: 'JetBrainsMono_400Regular',
      interface: 'JetBrainsMono_400Regular',
      numeric: 'JetBrainsMono_700Bold',
    },
  },
  system: {
    id: 'system',
    name: 'System Default (Native Clean)',
    description: 'Platform standard system typography',
    sample: '₹18,640.00 · Native Standard',
    fontFamilies: {
      regular: undefined,
      medium: undefined,
      semiBold: undefined,
      bold: undefined,
      extraBold: undefined,
      mono: undefined,
      monoRegular: undefined,
      interface: undefined,
      numeric: undefined,
    },
  },
} as const;

export type TypographyKey = keyof typeof TYPOGRAPHY_PRESETS;

export const fontFamilies = { ...TYPOGRAPHY_PRESETS.manrope.fontFamilies };

export const typography: Record<string, TextStyle> = {};

export function rebuildTypography() {
  const updated: Record<string, TextStyle> = {
    eyebrow: {
      fontFamily: fontFamilies.extraBold,
      fontSize: 8,
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
      fontFamily: fontFamilies.bold,
      fontSize: 24,
      letterSpacing: -0.8,
      color: colors.text,
    },
    monoSm: {
      fontFamily: fontFamilies.mono,
      fontSize: 11,
      color: colors.text,
    },
    amountLarge: {
      fontFamily: fontFamilies.bold,
      fontSize: 36,
      color: colors.text,
    },
    amountRow: {
      fontFamily: fontFamilies.bold,
      fontSize: 16,
      color: colors.text,
    },
    pageTitle: {
      fontFamily: fontFamilies.bold,
      fontSize: 21,
      lineHeight: 26,
      letterSpacing: -0.8,
      color: colors.text,
    },
    heroCardAmount: {
      fontFamily: fontFamilies.bold,
      fontSize: 35,
      lineHeight: 40,
      letterSpacing: -1.8,
      color: colors.text,
    },
    rowTitle: {
      fontFamily: fontFamilies.medium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    rowSub: {
      fontFamily: fontFamilies.medium,
      fontSize: 10,
      lineHeight: 14,
      color: colors.muted,
    },
    rowAmount: {
      fontFamily: fontFamilies.medium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    rowFoot: {
      fontFamily: fontFamilies.medium,
      fontSize: 9,
      lineHeight: 13,
      color: colors.muted,
    },
  };
  Object.assign(typography, updated);
}

// Initialize on module load
rebuildTypography();

export function applyTypographyPreset(typographyId: TypographyKey): TypographyPresetConfig {
  const preset = TYPOGRAPHY_PRESETS[typographyId] || TYPOGRAPHY_PRESETS.manrope;
  Object.assign(fontFamilies, preset.fontFamilies);
  rebuildTypography();
  return preset;
}

export function getTypographyPreset(typographyId?: string | null): TypographyPresetConfig {
  if (!typographyId || !(typographyId in TYPOGRAPHY_PRESETS)) {
    return TYPOGRAPHY_PRESETS.manrope;
  }
  return TYPOGRAPHY_PRESETS[typographyId as TypographyKey];
}
