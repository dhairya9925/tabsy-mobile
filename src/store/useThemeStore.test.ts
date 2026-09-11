import test from 'node:test';
import assert from 'node:assert';
import { useThemeStore } from './useThemeStore';
import { colors, THEME_PALETTES } from '../theme/tokens';
import { fontFamilies, TYPOGRAPHY_PRESETS } from '../theme/typography';

test('useThemeStore should initialize with Sprout Direction 09 and Manrope default', () => {
  // Reset first to ensure clean state
  useThemeStore.getState().resetToDefault();

  const state = useThemeStore.getState();
  assert.strictEqual(state.paletteId, 'sprout');
  assert.strictEqual(state.typographyId, 'manrope');
  assert.strictEqual(state.isDark, false);
  assert.strictEqual(state.isDefault, true);
  assert.strictEqual(colors.background, THEME_PALETTES.sprout.colors.background);
  assert.strictEqual(colors.accent, THEME_PALETTES.sprout.colors.accent);
  assert.strictEqual(fontFamilies.bold, TYPOGRAPHY_PRESETS.manrope.fontFamilies.bold);
});

test('useThemeStore setPalette should update theme palette, isDark, and tokens', () => {
  const initialVersion = useThemeStore.getState().themeVersion;

  useThemeStore.getState().setPalette('sproutNight');
  const state = useThemeStore.getState();

  assert.strictEqual(state.paletteId, 'sproutNight');
  assert.strictEqual(state.isDark, true);
  assert.strictEqual(state.isDefault, false);
  assert.strictEqual(state.themeVersion, initialVersion + 1);
  assert.strictEqual(colors.background, THEME_PALETTES.sproutNight.colors.background);
  assert.strictEqual(colors.accent, THEME_PALETTES.sproutNight.colors.accent);
});

test('useThemeStore setTypography should update typography preset and font families', () => {
  const initialVersion = useThemeStore.getState().themeVersion;

  useThemeStore.getState().setTypography('mono');
  const state = useThemeStore.getState();

  assert.strictEqual(state.typographyId, 'mono');
  assert.strictEqual(state.isDefault, false);
  assert.strictEqual(state.themeVersion, initialVersion + 1);
  assert.strictEqual(fontFamilies.bold, TYPOGRAPHY_PRESETS.mono.fontFamilies.bold);
});

test('useThemeStore resetToDefault should restore Sprout palette and Manrope typography', () => {
  useThemeStore.getState().resetToDefault();
  const state = useThemeStore.getState();

  assert.strictEqual(state.paletteId, 'sprout');
  assert.strictEqual(state.typographyId, 'manrope');
  assert.strictEqual(state.isDark, false);
  assert.strictEqual(state.isDefault, true);
  assert.strictEqual(colors.background, THEME_PALETTES.sprout.colors.background);
  assert.strictEqual(colors.accent, THEME_PALETTES.sprout.colors.accent);
  assert.strictEqual(fontFamilies.bold, TYPOGRAPHY_PRESETS.manrope.fontFamilies.bold);
});

test('useThemeStore sets isDefault to true when manually navigating back to sprout and manrope', () => {
  useThemeStore.getState().setPalette('sproutMoon');
  assert.strictEqual(useThemeStore.getState().isDefault, false);

  useThemeStore.getState().setPalette('sprout');
  // typography is still manrope from previous test
  assert.strictEqual(useThemeStore.getState().isDefault, true);
});
