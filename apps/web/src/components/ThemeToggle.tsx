import { Moon, Sun } from 'lucide-react';
import { useThemeTransition } from '@/lib/hooks/useThemeTransition';
import { HeroButton } from '@/components/HeroControls';

type ThemeToggleProps = {
  className?: string;
  iconSize?: number;
};

/** 主题切换按钮 — 日间 Moon / 夜间 Sun，带根元素 View Transition 扫过动画。 */
export function ThemeToggle({
  className = 'inline-flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-alt',
  iconSize = 18,
}: ThemeToggleProps) {
  const { theme, toggle } = useThemeTransition();

  return (
    <HeroButton
      type="button"
      onClick={toggle}
      className={className}
      aria-label={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
    >
      {theme === 'light' ? <Moon size={iconSize} /> : <Sun size={iconSize} />}
    </HeroButton>
  );
}
