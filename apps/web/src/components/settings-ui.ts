export type SettingsTint = 'peach' | 'lavender' | 'sage' | 'mist' | 'pink';

export const settingsTintClass: Record<SettingsTint, string> = {
  peach: 'bg-chip-peach text-peach',
  lavender: 'bg-chip-lavender text-lavender',
  sage: 'bg-chip-sage text-sage',
  mist: 'bg-chip-mist text-mist',
  pink: 'bg-chip-pink text-pink',
};

export const settingsHeaderClassName =
  'relative min-h-[150px] border-b border-hairline px-4 pb-6 pt-16 sm:px-8 sm:pt-20 lg:min-h-[158px] lg:px-10 lg:pb-8 lg:pt-16';

export const settingsTitleClassName =
  'font-serif text-[28px] font-semibold leading-tight text-ink sm:text-[34px]';
