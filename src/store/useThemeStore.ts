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
import { appStorage } from '../services/offline/storage';

const THEME_STORAGE_KEY = 'tabsy_user_theme_pref';

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
  initThemePreferences: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  paletteId: 'sprout',
  typographyId: 'manrope',
  themeVersion: 1,
  palette: THEME_PALETTES.sprout,
  typography: TYPOGRAPHY_PRESETS.manrope,
  isDark: false,
  isDefault: true,

  initThemePreferences: async () => {
    try {
      const saved = await appStorage.getItem<{ paletteId: PaletteKey; typographyId: TypographyKey }>(
        THEME_STORAGE_KEY
      );
      if (saved?.paletteId || saved?.typographyId) {
        const palId = saved.paletteId || 'sprout';
        const typoId = saved.typographyId || 'manrope';
        const palette = applyThemePalette(palId);
        const typography = applyTypographyPreset(typoId);
        const isDefault = palId === 'sprout' && typoId === 'manrope';
        set((s) => ({
          paletteId: palId,
          typographyId: typoId,
          palette,
          typography,
          isDark: palette.isDark,
          themeVersion: s.themeVersion + 1,
          isDefault,
        }));
      }
    } catch (err) {
      console.warn('[useThemeStore] Error loading theme pref:', err);
    }
  },

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
    appStorage.setItem(THEME_STORAGE_KEY, { paletteId: id, typographyId }).catch(() => {});
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
    appStorage.setItem(THEME_STORAGE_KEY, { paletteId, typographyId: id }).catch(() => {});
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
    appStorage.removeItem(THEME_STORAGE_KEY).catch(() => {});
  },
}));

// Automatically hydrate preferences on boot
useThemeStore.getState().initThemePreferences().catch(() => {});

