import { describe, expect, test } from 'vitest';
import {
  DEFAULT_THEME_PALETTE_ID,
  THEME_PALETTES,
  isThemePaletteId,
  themePaletteById,
} from './theme-palettes';

describe('theme palettes', () => {
  test('keeps warm matte as the default palette', () => {
    expect(DEFAULT_THEME_PALETTE_ID).toBe('warm-matte');
    expect(themePaletteById(DEFAULT_THEME_PALETTE_ID).id).toBe('warm-matte');
  });

  test('ships the default palette and five macaron palettes', () => {
    expect(THEME_PALETTES).toHaveLength(6);
  });

  test('validates persisted palette ids', () => {
    expect(isThemePaletteId('peach-milk')).toBe(true);
    expect(isThemePaletteId('unknown')).toBe(false);
    expect(isThemePaletteId(null)).toBe(false);
  });
});
