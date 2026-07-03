import { useSyncExternalStore, useCallback } from 'react';
import {
  DEFAULT_THEME_PALETTE_ID,
  isThemePaletteId,
  type ThemePaletteId,
} from '@/lib/theme-palettes';

const STORAGE_KEY = 'dicha-theme';
const PALETTE_STORAGE_KEY = 'dicha-theme-palette';

type Theme = 'light' | 'dark';
type ThemeState = {
  theme: Theme;
  palette: ThemePaletteId;
};

const SERVER_STATE: ThemeState = { theme: 'light', palette: DEFAULT_THEME_PALETTE_ID };

// ─── 模块级单例 store ───────────────────────────────────────────────────────
// 所有 useTheme() 实例共享同一份状态，避免各自 useState 造成的不同步问题。

function readStored(): Theme {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function readStoredPalette(): ThemePaletteId {
  if (typeof window === 'undefined') return DEFAULT_THEME_PALETTE_ID;
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return isThemePaletteId(stored) ? stored : DEFAULT_THEME_PALETTE_ID;
}

function applyDocumentState(state: ThemeState) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.themePalette = state.palette;
}

function persistState(state: ThemeState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, state.theme);
  localStorage.setItem(PALETTE_STORAGE_KEY, state.palette);
}

let _state: ThemeState = {
  theme: readStored(),
  palette: readStoredPalette(),
};

// 初始化时同步 DOM
applyDocumentState(_state);

const listeners = new Set<() => void>();

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

function applyState(next: ThemeState) {
  _state = next;
  applyDocumentState(next);
  persistState(next);
  listeners.forEach((fn) => fn());
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/** 主题 hook — 基于模块级单例，所有调用组件同步更新。 */
export function useTheme() {
  const { theme, palette } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = _state.theme === 'dark' ? 'light' : 'dark';
    applyState({ ..._state, theme: next });
  }, []);

  const setPalette = useCallback((next: ThemePaletteId) => {
    applyState({ ..._state, palette: next });
  }, []);

  return { theme, palette, toggle, setPalette } as const;
}
