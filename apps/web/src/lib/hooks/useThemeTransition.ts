import { useRef, useCallback } from 'react';
import { useTheme } from './useTheme';

/** 带 View Transition 扫过动画的主题切换（与 Header 同款，供落地页等复用）。 */
export function useThemeTransition() {
  const { theme, toggle } = useTheme();
  const animatingRef = useRef(false);

  const toggleWithTransition = useCallback(() => {
    if (animatingRef.current) return;

    if (typeof document === 'undefined' || !document.startViewTransition) {
      toggle();
      return;
    }

    animatingRef.current = true;
    const transition = document.startViewTransition(() => {
      toggle();
    });
    transition.finished
      .then(() => {
        animatingRef.current = false;
      })
      .catch(() => {
        animatingRef.current = false;
      });
  }, [toggle]);

  return { theme, toggle: toggleWithTransition } as const;
}
