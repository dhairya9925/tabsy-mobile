import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

export function useTheme() {
  const palette = useThemeStore((s) => s.palette);
  const typography = useThemeStore((s) => s.typography);
  const isDark = useThemeStore((s) => s.isDark);
  const themeVersion = useThemeStore((s) => s.themeVersion);

  return {
    colors: palette.colors,
    chartColors: palette.chartColors,
    statusColors: palette.statusColors,
    shadows: palette.shadows,
    typography,
    isDark,
    themeVersion,
    paletteId: palette.id,
  };
}

export type ThemeContextValue = ReturnType<typeof useTheme>;

export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (theme: ThemeContextValue) => T
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme.themeVersion, theme.paletteId]);
}
