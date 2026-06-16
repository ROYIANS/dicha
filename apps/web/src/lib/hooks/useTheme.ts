import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'dicha-theme';

type Theme = 'light' | 'dark';

// ─── 模块级单例 store ───────────────────────────────────────────────────────
// 所有 useTheme() 实例共享同一份状态，避免各自 useState 造成的不同步问题。

function readStored(): Theme {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

let _theme: Theme = readStored();

// 初始化时同步 DOM
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = _theme;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): Theme {
  return _theme;
}

function getServerSnapshot(): Theme {
  return 'light';
}

function applyTheme(next: Theme) {
  _theme = next;
  document.documentElement.dataset.theme = next;
  localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach(fn => fn());
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/** 主题 hook — 基于模块级单例，所有调用组件同步更新。 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = _theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }, []);

  return { theme, toggle } as const;
}
