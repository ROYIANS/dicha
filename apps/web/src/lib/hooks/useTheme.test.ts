import { describe, expect, test } from 'vitest';
import { isThemeMode, millisecondsUntilNextThemeBoundary, resolveThemeForDate } from './useTheme';

describe('theme mode helpers', () => {
  test('resolves day and night from local clock time', () => {
    expect(resolveThemeForDate(new Date(2026, 0, 1, 5, 59))).toBe('dark');
    expect(resolveThemeForDate(new Date(2026, 0, 1, 6, 0))).toBe('light');
    expect(resolveThemeForDate(new Date(2026, 0, 1, 17, 59))).toBe('light');
    expect(resolveThemeForDate(new Date(2026, 0, 1, 18, 0))).toBe('dark');
  });

  test('calculates the next automatic theme boundary', () => {
    expect(millisecondsUntilNextThemeBoundary(new Date(2026, 0, 1, 5, 30))).toBe(30 * 60 * 1000);
    expect(millisecondsUntilNextThemeBoundary(new Date(2026, 0, 1, 12, 0))).toBe(
      6 * 60 * 60 * 1000,
    );
    expect(millisecondsUntilNextThemeBoundary(new Date(2026, 0, 1, 18, 0))).toBe(
      12 * 60 * 60 * 1000,
    );
  });

  test('validates persisted theme mode ids', () => {
    expect(isThemeMode('manual')).toBe(true);
    expect(isThemeMode('auto')).toBe(true);
    expect(isThemeMode('system')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});
