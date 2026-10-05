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
  rebuildTypography,
} from '../theme/typography';
import { appStorage } from '../services/offline/storage';
import { QuickAddModule } from '../native/QuickAddModule';

const THEME_STORAGE_KEY = 'tabsy_user_theme_pref';

function syncNativeTheme(palette: ThemePaletteConfig) {
  try {
    QuickAddModule.syncTheme({
      paletteId: palette.id,
      isDark: palette.isDark,
      cardBg: palette.isDark ? (palette.colors.surface || '#15241D') : '#FFFFFF',
      innerCardBg: palette.isDark ? (palette.colors.surfaceElevated || '#1D2E25') : '#F8FAFC',
      line: palette.colors.line || (palette.isDark ? '#24382D' : '#E2E8F0'),
      text: palette.colors.text || (palette.isDark ? '#F0F6F2' : '#0F172A'),
      muted: palette.colors.muted || (palette.isDark ? '#8AA194' : '#64748B'),
      accent: palette.colors.accent || (palette.isDark ? '#86C49A' : '#2E6930'),
      onAccent: palette.colors.onAccent || (palette.isDark ? '#0E1813' : '#FFFFFF'),
      accentSoft: palette.colors.accentSoft || (palette.isDark ? '#1D3B2E' : '#EBF5EC'),
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}

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
        syncNativeTheme(palette);
      }
    } catch (err) {
      console.warn('[useThemeStore] Error loading theme pref:', err);
    }
  },

  setPalette: (id: PaletteKey) => {
    const palette = applyThemePalette(id);
    rebuildTypography();
    const typographyId = get().typographyId;
    const isDefault = id === 'sprout' && typographyId === 'manrope';
    set((s) => ({
      paletteId: id,
      palette,
      isDark: palette.isDark,
      themeVersion: s.themeVersion + 1,
      isDefault,
    }));
    syncNativeTheme(palette);
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
    rebuildTypography();
    set((s) => ({
      paletteId: 'sprout',
      typographyId: 'manrope',
      palette,
      typography,
      isDark: false,
      themeVersion: s.themeVersion + 1,
      isDefault: true,
    }));
    syncNativeTheme(palette);
    appStorage.removeItem(THEME_STORAGE_KEY).catch(() => {});
  },
}));

// Automatically hydrate preferences on boot
useThemeStore.getState().initThemePreferences().catch(() => {});

