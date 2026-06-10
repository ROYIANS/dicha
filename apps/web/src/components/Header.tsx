import { Search, Bell, User, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';

type HeaderProps = {
  navOpen?: boolean;
  onMenuClick?: () => void;
};

/** 内容区顶部 chrome — 搜索 + 通知 + 头像 + 主题切换。跨 feature 复用纯展示组件。 */
export function Header({ navOpen = false, onMenuClick }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
      {onMenuClick ? (
        <button
          type="button"
          aria-label={navOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={navOpen}
          aria-haspopup="dialog"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline text-ink-soft hover:bg-surface-alt lg:hidden"
          onClick={onMenuClick}
        >
          <Menu size={18} />
        </button>
      ) : null}

      <button
        onClick={() => toast.info('搜索功能即将开放')}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-hairline bg-surface px-3 text-left text-sm text-ink-faint transition-colors hover:bg-surface-alt sm:h-10 sm:max-w-md sm:px-4"
      >
        <Search size={16} className="shrink-0" />
        <span className="truncate max-sm:sr-only">{t('header.searchPlaceholder')}</span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <button
          onClick={() => toast.info('通知功能即将开放')}
          className="relative flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-alt"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-peach" />
        </button>

        <button
          onClick={() => toast.info('个人空间即将开放')}
          className="flex size-9 items-center justify-center rounded-full bg-lavender text-white transition-opacity hover:opacity-90"
        >
          <User size={18} />
        </button>
      </div>
    </div>
  );
}
