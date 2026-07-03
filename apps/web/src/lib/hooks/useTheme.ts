import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_THEME_PALETTE_ID,
  isThemePaletteId,
  type ThemePaletteId,
} from '@/lib/theme-palettes';

const STORAGE_KEY = 'dicha-theme';
const MODE_STORAGE_KEY = 'dicha-theme-mode';
const PALETTE_STORAGE_KEY = 'dicha-theme-palette';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'manual' | 'auto';

type ThemeState = {
  manualTheme: Theme;
  mode: ThemeMode;
  theme: Theme;
  palette: ThemePaletteId;
};

const SERVER_STATE: ThemeState = {
  manualTheme: 'light',
  mode: 'manual',
  theme: 'light',
  palette: DEFAULT_THEME_PALETTE_ID,
};

// ─── 模块级单例 store ───────────────────────────────────────────────────────
// 所有 useTheme() 实例共享同一份状态，避免各自 useState 造成的不同步问题。

function readStored(): Theme {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'manual' || value === 'auto';
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'manual';
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return isThemeMode(stored) ? stored : 'manual';
}

function readStoredPalette(): ThemePaletteId {
  if (typeof window === 'undefined') return DEFAULT_THEME_PALETTE_ID;
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return isThemePaletteId(stored) ? stored : DEFAULT_THEME_PALETTE_ID;
}

export function resolveThemeForDate(date: Date): Theme {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

export function millisecondsUntilNextThemeBoundary(date: Date): number {
  const next = new Date(date);
  const hour = date.getHours();

  if (hour < 6) {
    next.setHours(6, 0, 0, 0);
  } else if (hour < 18) {
    next.setHours(18, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }

  return Math.max(next.getTime() - date.getTime(), 0);
}

function applyDocumentState(state: ThemeState) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.themePalette = state.palette;
}

function persistState(state: ThemeState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, state.manualTheme);
  localStorage.setItem(MODE_STORAGE_KEY, state.mode);
  localStorage.setItem(PALETTE_STORAGE_KEY, state.palette);
}

const storedMode = readStoredMode();
const storedManualTheme = readStored();

let _state: ThemeState = {
  manualTheme: storedManualTheme,
  mode: storedMode,
  theme: storedMode === 'auto' ? resolveThemeForDate(new Date()) : storedManualTheme,
  palette: readStoredPalette(),
};

// 初始化时同步 DOM
applyDocumentState(_state);

const listeners = new Set<() => void>();
let autoTimer: ReturnType<typeof setTimeout> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeState {
  return _state;
}

function getServerSnapshot(): ThemeState {
  return SERVER_STATE;
}

function scheduleAutoThemeUpdate() {
  if (autoTimer !== undefined) {
    clearTimeout(autoTimer);
    autoTimer = undefined;
  }

  if (typeof window === 'undefined' || _state.mode !== 'auto') return;

  const delay = millisecondsUntilNextThemeBoundary(new Date()) + 50;
  autoTimer = setTimeout(() => {
    applyState({ ..._state, theme: resolveThemeForDate(new Date()) });
  }, delay);
}

function applyState(next: ThemeState) {
  _state = next;
  applyDocumentState(next);
  persistState(next);
  listeners.forEach((fn) => fn());
  scheduleAutoThemeUpdate();
}

scheduleAutoThemeUpdate();

// ─── Hook ──────────────────────────────────────────────────────────────────

/** 主题 hook — 基于模块级单例，所有调用组件同步更新。 */
export function useTheme() {
  const { mode, theme, palette } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = _state.theme === 'dark' ? 'light' : 'dark';
    applyState({ ..._state, manualTheme: next, mode: 'manual', theme: next });
  }, []);

  const setPalette = useCallback((next: ThemePaletteId) => {
    applyState({ ..._state, palette: next });
  }, []);

  const setAutoMode = useCallback((enabled: boolean) => {
    if (enabled) {
      applyState({ ..._state, mode: 'auto', theme: resolveThemeForDate(new Date()) });
      return;
    }

    applyState({ ..._state, manualTheme: _state.theme, mode: 'manual' });
  }, []);

  return { theme, palette, mode, toggle, setPalette, setAutoMode } as const;
}
