import { Search, Bell, User, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useRef, useCallback } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';

/** 内容区顶部 chrome — 搜索 + 通知 + 头像 + 主题切换。跨 feature 复用纯展示组件。 */
export function Header() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const animatingRef = useRef(false);

  const handleToggle = useCallback(() => {
    if (animatingRef.current) return;

    if (!document.startViewTransition) {
      toggle();
      return;
    }

    animatingRef.current = true;

    const transition = document.startViewTransition(() => {
      toggle();
    });

    transition.finished
      .then(() => { animatingRef.current = false; })
      .catch(() => { animatingRef.current = false; });
  }, [toggle]);

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {/* Search — 占主要宽度，stub */}
      <button
        onClick={() => toast.info('搜索功能即将开放')}
        className="flex-1 max-w-md h-10 px-4 rounded-full bg-surface border border-hairline text-sm text-ink-faint text-left flex items-center gap-2 hover:bg-surface-alt transition-colors"
      >
        <Search size={16} />
        <span>{t('header.searchPlaceholder')}</span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={handleToggle}
          className="w-9 h-9 rounded-full hover:bg-surface-alt flex items-center justify-center text-ink-soft transition-colors"
          aria-label={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => toast.info('通知功能即将开放')}
          className="relative w-9 h-9 rounded-full hover:bg-surface-alt flex items-center justify-center text-ink-soft transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-peach" />
        </button>

        {/* User avatar — placeholder */}
        <button
          onClick={() => toast.info('个人空间即将开放')}
          className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center text-white transition-opacity hover:opacity-90"
        >
          <User size={18} />
        </button>
      </div>
    </div>
  );
}
