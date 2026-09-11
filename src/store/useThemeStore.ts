import { create } from 'zustand';
import {
  PaletteKey,
  THEME_PALETTES,
  applyThemePalette,
  ThemePaletteConfig,
} from '../theme/tokens';
import {
  TypographyKey,
  TYPOGRAPHY_PRESETS,
  applyTypographyPreset,
  TypographyPresetConfig,
} from '../theme/typography';

export interface ThemeStoreState {
  paletteId: PaletteKey;
  typographyId: TypographyKey;
  themeVersion: number;
  palette: ThemePaletteConfig;
  typography: TypographyPresetConfig;
  isDark: boolean;
  isDefault: boolean;
  setPalette: (id: PaletteKey) => void;
  setTypography: (id: TypographyKey) => void;
  resetToDefault: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  paletteId: 'sprout',
  typographyId: 'manrope',
  themeVersion: 1,
  palette: THEME_PALETTES.sprout,
  typography: TYPOGRAPHY_PRESETS.manrope,
  isDark: false,
  isDefault: true,

  setPalette: (id: PaletteKey) => {
    const palette = applyThemePalette(id);
    const typographyId = get().typographyId;
    const isDefault = id === 'sprout' && typographyId === 'manrope';
    set((s) => ({
      paletteId: id,
      palette,
      isDark: palette.isDark,
      themeVersion: s.themeVersion + 1,
      isDefault,
    }));
  },

  setTypography: (id: TypographyKey) => {
    const typography = applyTypographyPreset(id);
    const paletteId = get().paletteId;
    const isDefault = paletteId === 'sprout' && id === 'manrope';
    set((s) => ({
      typographyId: id,
      typography,
      themeVersion: s.themeVersion + 1,
      isDefault,
    }));
  },

  resetToDefault: () => {
    const palette = applyThemePalette('sprout');
    const typography = applyTypographyPreset('manrope');
    set((s) => ({
      paletteId: 'sprout',
      typographyId: 'manrope',
      palette,
      typography,
      isDark: false,
      themeVersion: s.themeVersion + 1,
      isDefault: true,
    }));
  },
}));
