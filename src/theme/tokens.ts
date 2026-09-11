export const colors = {
  // Base canvas & surfaces
  background: '#EFF5ED',      // Mist green app canvas
  surface: '#FBFDF7',         // Warm white card/sheet surface
  surfaceElevated: '#FFFFFF', // High-contrast surface
  
  // Content & text
  text: '#183228',            // Deep forest green primary text
  muted: '#6D7C72',           // Sage grey secondary text
  line: '#CBD7CC',            // Subtle card & divider border
  
  // Brand accents & highlights
  accent: '#407A58',          // Botanical green CTA & active tab
  onAccent: '#FFFFFF',        // White text/icon on accent
  accentSoft: '#DCE8DD',      // Light tint for pressed states
  
  // Semantic status & rhythm indicators
  sun: '#F0BF67',             // Warm gold: avatar, ring fill, streaks
  clay: '#F4DACD',            // Soft peach: "to pay" pill, warning tint
  soft: '#D8E8CB',            // Tender leaf: "to receive" pill, streak check
  negative: '#C86145',        // Brick red: expense amount, errors
  negativeSoft: '#FADFD8',    // Soft error alert background
  positive: '#3DBE5C',        // Success green
} as const;

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

export const chartColors = {
  // 6-month stacked bars
  personal: '#3F7254',      // Moss green lower stack & legend
  groupShare: '#78919D',    // Muted slate-blue upper stack & legend

  // Category palette
  food: '#C89D57',          // Food & Dining
  transport: '#4C7965',     // Transport / Travel
  shopping: '#B97C83',      // Shopping
  bills: '#718AA0',         // Bills / Utilities
  entertainment: '#897A98', // Entertainment
  other: '#7A867D',         // Other

  // Chart surfaces & tracks
  track: '#DCE7DE',         // Quiet donut/allocation/empty support surface
  selectedWash: '#E7F0E6',  // Six-month selection background
} as const;

export type Colors = typeof colors;
export type ChartColors = typeof chartColors;
export type Radii = typeof radii;
export type Spacing = typeof spacing;
