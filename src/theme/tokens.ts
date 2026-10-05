export interface ThemePaletteConfig {
  id: string;
  name: string;
  tagline: string;
  isDark: boolean;
  dots: readonly [string, string, string]; // [accent, sun, soft] preview swatches
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    muted: string;
    line: string;
    accent: string;
    onAccent: string;
    accentSoft: string;
    sun: string;
    clay: string;
    soft: string;
    negative: string;
    negativeSoft: string;
    positive: string;
    brandBase: string;
    goldHighlight: string;
    goldBackground: string;
  };
  chartColors: {
    personal: string;
    groupShare: string;
    food: string;
    transport: string;
    shopping: string;
    bills: string;
    entertainment: string;
    other: string;
    track: string;
    selectedWash: string;
  };
  statusColors: {
    negativeText: string;
    negativeBg: string;
    positiveText: string;
    positiveBg: string;
    warningText: string;
    warningBg: string;
    neutralText: string;
    neutralBg: string;
    leadBadgeBg: string;
    leadBadgeText: string;
    forestCardBg: string;
    forestCardBorder: string;
  };
  shadows: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    modal: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

export const THEME_PALETTES = {
  sprout: {
    id: 'sprout',
    name: 'Sprout',
    tagline: 'Botanical green · Warm gold · Mist',
    isDark: false,
    dots: ['#407A58', '#F0BF67', '#D8E8CB'],
    colors: {
      background: '#EFF5ED',      // Mist green app canvas
      surface: '#FBFDF7',         // Warm white card/sheet surface
      surfaceElevated: '#FFFFFF', // High-contrast surface
      text: '#183228',            // Deep forest green primary text
      muted: '#6D7C72',           // Sage grey secondary text
      line: '#CBD7CC',            // Subtle card & divider border
      accent: '#407A58',          // Botanical green CTA & active tab
      onAccent: '#FFFFFF',        // White text/icon on accent
      accentSoft: '#DCE8DD',      // Light tint for pressed states
      sun: '#F0BF67',             // Warm gold: avatar, ring fill, streaks
      clay: '#F4DACD',            // Soft peach: "to pay" pill, warning tint
      soft: '#D8E8CB',            // Tender leaf: "to receive" pill, streak check
      negative: '#C86145',        // Brick red: expense amount, errors
      negativeSoft: '#FADFD8',    // Soft error alert background
      positive: '#3DBE5C',        // Success green
      brandBase: '#183327',
      goldHighlight: '#E6D3A3',
      goldBackground: '#FDF6E2',
    },
    chartColors: {
      personal: '#3F7254',      // Moss green lower stack & legend
      groupShare: '#78919D',    // Muted slate-blue upper stack & legend
      food: '#C89D57',          // Food & Dining
      transport: '#4C7965',     // Transport / Travel
      shopping: '#B97C83',      // Shopping
      bills: '#718AA0',         // Bills / Utilities
      entertainment: '#897A98', // Entertainment
      other: '#7A867D',         // Other
      track: '#DCE7DE',         // Quiet donut/allocation/empty support surface
      selectedWash: '#E7F0E6',  // Six-month selection background
    },
    statusColors: {
      negativeText: '#991B1B', // Deep red for owing/unpaid (WCAG AAA)
      negativeBg: '#FEE2E2',   // Soft light red pill surface
      positiveText: '#166534', // Deep emerald for paid/overpaid
      positiveBg: '#DCFCE7',   // Soft light emerald pill surface
      warningText: '#9A3412',  // Deep amber for pending coordinator actions
      warningBg: '#FFEDD5',   // Soft light amber pill surface
      neutralText: '#334155',  // Slate for settled/neutral
      neutralBg: '#F1F5F9',   // Slate soft pill surface
      leadBadgeBg: '#183228',  // Deep forest green capsule
      leadBadgeText: '#E8F5E9',// Mint white text
      forestCardBg: '#183228', // Signature Sprout dark forest card
      forestCardBorder: '#284C3E',
    },
    shadows: {
      card: {
        shadowColor: '#183228',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.035,
        shadowRadius: 4,
        elevation: 1,
      },
      modal: {
        shadowColor: '#183228',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      },
    }
  },
  sproutNight: {
    id: 'sproutNight',
    name: 'Sprout Night',
    tagline: 'Forest obsidian · Mint · Warm gold',
    isDark: true,
    dots: ['#86C49A', '#F0BF67', '#1D3B2E'],
    colors: {
      background: '#0E1813',
      surface: '#15241D',
      surfaceElevated: '#1D2E25', // Increased contrast for popovers
      text: '#F0F6F2',
      muted: '#8AA194',
      line: '#24382D',
      accent: '#86C49A',
      onAccent: '#0E1813',
      accentSoft: '#1D3B2E',
      sun: '#F0BF67',
      clay: '#422B22',
      soft: '#1F382B',
      negative: '#E87D65',
      negativeSoft: '#381C16',
      positive: '#4ADE80',
      brandBase: '#000000',
      goldHighlight: '#7A622A',
      goldBackground: '#262214',
    },
    chartColors: {
      personal: '#86C49A',      // Soft mint sage
      groupShare: '#7E988A',    // Muted slate sage
      food: '#C89D57',          // Warm ochre (tasteful amber, not neon yellow)
      transport: '#5A967F',     // Muted eucalyptus teal-sage
      shopping: '#B97C83',      // Dusty rose
      bills: '#6E8EA8',         // Soft slate blue
      entertainment: '#8F7D9E', // Muted wisteria lavender
      other: '#7A8C80',         // Soft sage grey
      track: '#1B2C23',         // Subtle card track
      selectedWash: '#1F3529',
    },
    statusColors: {
      negativeText: '#FCA5A5', 
      negativeBg: '#451A1A',   
      positiveText: '#86EFAC', 
      positiveBg: '#14532D',   
      warningText: '#FDBA74',  
      warningBg: '#431407',   
      neutralText: '#CBD5E1',  
      neutralBg: '#1E293B',   
      leadBadgeBg: '#0F172A',  
      leadBadgeText: '#F8FAFC',
      forestCardBg: '#0A120E', 
      forestCardBorder: '#16281F',
    },
    shadows: {
      card: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 1,
      },
      modal: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
      },
    }
  },
  sproutMoon: {
    id: 'sproutMoon',
    name: 'Sprout Moon',
    tagline: 'Deep navy · Slate blue · Cyan',
    isDark: true,
    dots: ['#A5D2C8', '#E8AE8C', '#223A41'],
    colors: {
      background: '#101D22',
      surface: '#172A30',
      surfaceElevated: '#1F363E',
      text: '#EAF3F5',
      muted: '#7E9BA3',
      line: '#28444E',
      accent: '#A5D2C8',
      onAccent: '#101D22',
      accentSoft: '#223A41',
      sun: '#F0BF67',
      clay: '#3D2A26',
      soft: '#213A42',
      negative: '#E8AE8C',
      negativeSoft: '#3D2A26',
      positive: '#6EE7B7',
      brandBase: '#0F172A',
      goldHighlight: '#5A4A28',
      goldBackground: '#1C252D',
    },
    chartColors: {
      personal: '#A5D2C8',
      groupShare: '#7E9BA3',
      food: '#C89D57',
      transport: '#5A967F',
      shopping: '#B97C83',
      bills: '#6E8EA8',
      entertainment: '#8F7D9E',
      other: '#7E9BA3',
      track: '#213A42',
      selectedWash: '#223D47',
    },
    statusColors: {
      negativeText: '#FDA4AF',
      negativeBg: '#4C1D95',
      positiveText: '#6EE7B7',
      positiveBg: '#064E3B',
      warningText: '#FCD34D',
      warningBg: '#78350F',
      neutralText: '#94A3B8',
      neutralBg: '#1E293B',
      leadBadgeBg: '#020617',
      leadBadgeText: '#F8FAFC',
      forestCardBg: '#0B1519',
      forestCardBorder: '#14252B',
    },
    shadows: {
      card: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 1,
      },
      modal: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
      },
    }
  },
  sproutEmber: {
    id: 'sproutEmber',
    name: 'Sprout Ember',
    tagline: 'Charcoal canvas · Roasted clay · Lime',
    isDark: true,
    dots: ['#C6D980', '#ED9A73', '#36302A'],
    colors: {
      background: '#191614',
      surface: '#28221E',
      surfaceElevated: '#342D28',
      text: '#F7F2ED',
      muted: '#D6C8BB', // Softened for warmth and readability
      line: '#3E352E',
      accent: '#C6D980',
      onAccent: '#191614',
      accentSoft: '#36302A',
      sun: '#F0BF67',
      clay: '#482B24',
      soft: '#2D331F',
      negative: '#ED9A73',
      negativeSoft: '#482B24',
      positive: '#A3E635',
      brandBase: '#120F0D',
      goldHighlight: '#594A2D',
      goldBackground: '#26221E',
    },
    chartColors: {
      personal: '#C6D980',
      groupShare: '#C28268',
      food: '#C89D57',
      transport: '#7E9E54',
      shopping: '#B97C83',
      bills: '#6E8EA8',
      entertainment: '#8F7D9E',
      other: '#A3958B',
      track: '#36302A',
      selectedWash: '#3A322B',
    },
    statusColors: {
      negativeText: '#FDBA74',
      negativeBg: '#451A03',
      positiveText: '#BEF264',
      positiveBg: '#3F6212',
      warningText: '#FDE047',
      warningBg: '#713F12',
      neutralText: '#E2E8F0',
      neutralBg: '#334155',
      leadBadgeBg: '#020617',
      leadBadgeText: '#F1F5F9',
      forestCardBg: '#151210',
      forestCardBorder: '#29211C',
    },
    shadows: {
      card: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 1,
      },
      modal: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
      },
    }
  },
} as const;

export type PaletteKey = keyof typeof THEME_PALETTES;

// Current mutable active color tokens
export const colors = { ...THEME_PALETTES.sprout.colors };
export const chartColors = { ...THEME_PALETTES.sprout.chartColors };
export const statusColors = { ...THEME_PALETTES.sprout.statusColors };
export const shadows = { ...THEME_PALETTES.sprout.shadows };

export function applyThemePalette(paletteId: PaletteKey): ThemePaletteConfig {
  const palette = THEME_PALETTES[paletteId] || THEME_PALETTES.sprout;
  Object.assign(colors, palette.colors);
  Object.assign(chartColors, palette.chartColors);
  Object.assign(statusColors, palette.statusColors);
  Object.assign(shadows, palette.shadows);
  return palette;
}

export function getThemePalette(paletteId?: string | null): ThemePaletteConfig {
  if (!paletteId || !(paletteId in THEME_PALETTES)) {
    return THEME_PALETTES.sprout;
  }
  return THEME_PALETTES[paletteId as PaletteKey];
}

export const radii = {
  xs: 6,
  sm: 9,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
} as const;

export type Colors = typeof colors;
export type ChartColors = typeof chartColors;
export type Radii = typeof radii;
export type Spacing = typeof spacing;
export type StatusColors = typeof statusColors;
