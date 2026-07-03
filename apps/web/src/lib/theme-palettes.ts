import { type SettingsTint } from '@/components/settings-ui';

export const DEFAULT_THEME_PALETTE_ID = 'warm-matte';

export const THEME_PALETTE_IDS = [
  DEFAULT_THEME_PALETTE_ID,
  'peach-milk',
  'sage-mint',
  'lavender-fog',
  'berry-mousse',
  'sea-salt',
] as const;

export type ThemePaletteId = (typeof THEME_PALETTE_IDS)[number];

export type ThemePalette = {
  id: ThemePaletteId;
  tint: SettingsTint;
  swatches: readonly [string, string, string, string];
};

export const THEME_PALETTES = [
  {
    id: 'warm-matte',
    tint: 'peach',
    swatches: ['#f7f4ef', '#ffffff', '#7a6248', '#b7aee0'],
  },
  {
    id: 'peach-milk',
    tint: 'peach',
    swatches: ['#fff4ed', '#fffdf9', '#b26f58', '#a9c0a0'],
  },
  {
    id: 'sage-mint',
    tint: 'sage',
    swatches: ['#f3f7ec', '#fffffb', '#6d8b63', '#a8c4d6'],
  },
  {
    id: 'lavender-fog',
    tint: 'lavender',
    swatches: ['#f5f1fb', '#fffdfd', '#8b75b8', '#f0c3a3'],
  },
  {
    id: 'berry-mousse',
    tint: 'pink',
    swatches: ['#fff1f4', '#fffdfd', '#b35f76', '#a9c0a0'],
  },
  {
    id: 'sea-salt',
    tint: 'mist',
    swatches: ['#eef8f7', '#fbffff', '#548f8b', '#e9b7be'],
  },
] as const satisfies readonly ThemePalette[];

export function isThemePaletteId(value: string | null): value is ThemePaletteId {
  return THEME_PALETTE_IDS.some((id) => id === value);
}

export function themePaletteById(id: ThemePaletteId): ThemePalette {
  switch (id) {
    case 'warm-matte':
      return THEME_PALETTES[0];
    case 'peach-milk':
      return THEME_PALETTES[1];
    case 'sage-mint':
      return THEME_PALETTES[2];
    case 'lavender-fog':
      return THEME_PALETTES[3];
    case 'berry-mousse':
      return THEME_PALETTES[4];
    case 'sea-salt':
      return THEME_PALETTES[5];
  }
}
