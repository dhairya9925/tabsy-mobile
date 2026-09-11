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
}

export const THEME_PALETTES = {
  sprout: {
    id: 'sprout',
    name: 'Direction 09 (Sprout)',
    tagline: 'Encouraging / Calm / Consistent',
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
  },
  sproutNight: {
    id: 'sproutNight',
    name: 'Direction 11 (Sprout Night)',
    tagline: 'Forest / Gold / Reassuring',
    isDark: true,
    dots: ['#86C49A', '#F0BF67', '#1D3B2E'],
    colors: {
      background: '#0E1813',
      surface: '#15241D',
      surfaceElevated: '#1D2E25',
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
    },
    chartColors: {
      personal: '#86C49A',
      groupShare: '#94A3B8',
      food: '#F0BF67',
      transport: '#5EEAD4',
      shopping: '#F472B6',
      bills: '#60A5FA',
      entertainment: '#C084FC',
      other: '#8AA194',
      track: '#1F3127',
      selectedWash: '#1F3529',
    },
  },
  sproutMoon: {
    id: 'sproutMoon',
    name: 'Direction 12 (Sprout Moon)',
    tagline: 'Blue-Green / Silver / Reflective',
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
    },
    chartColors: {
      personal: '#A5D2C8',
      groupShare: '#93C5FD',
      food: '#FCD34D',
      transport: '#67E8F9',
      shopping: '#FDA4AF',
      bills: '#93C5FD',
      entertainment: '#D8B4FE',
      other: '#7E9BA3',
      track: '#213A42',
      selectedWash: '#223D47',
    },
  },
  sproutEmber: {
    id: 'sproutEmber',
    name: 'Direction 13 (Sprout Ember)',
    tagline: 'Charcoal / Clay / Direct',
    isDark: true,
    dots: ['#C6D980', '#ED9A73', '#36302A'],
    colors: {
      background: '#191614',
      surface: '#28221E',
      surfaceElevated: '#342D28',
      text: '#F7F2ED',
      muted: '#A3958B',
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
    },
    chartColors: {
      personal: '#C6D980',
      groupShare: '#ED9A73',
      food: '#FBBF24',
      transport: '#A3E635',
      shopping: '#FB7185',
      bills: '#60A5FA',
      entertainment: '#E879F9',
      other: '#A3958B',
      track: '#36302A',
      selectedWash: '#3A322B',
    },
  },
} as const;

export type PaletteKey = keyof typeof THEME_PALETTES;

// Current mutable active color tokens (defaults to Sprout Direction 09)
export const colors = { ...THEME_PALETTES.sprout.colors };
export const chartColors = { ...THEME_PALETTES.sprout.chartColors };

export function applyThemePalette(paletteId: PaletteKey): ThemePaletteConfig {
  const palette = THEME_PALETTES[paletteId] || THEME_PALETTES.sprout;
  Object.assign(colors, palette.colors);
  Object.assign(chartColors, palette.chartColors);
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

export const shadows = {
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
} as const;

export type Colors = typeof colors;
export type ChartColors = typeof chartColors;
export type Radii = typeof radii;
export type Spacing = typeof spacing;
