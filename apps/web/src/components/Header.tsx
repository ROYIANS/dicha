import Avatar from 'boring-avatars';
import { Search, Bell, User, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Link, useRouteContext } from '@tanstack/react-router';
import { FrameNode } from '@/components/FrameNode';
import { ThemeToggle } from '@/components/ThemeToggle';
import { parseGeneratedAvatarMarker } from '@/lib/account-settings';

type HeaderProps = {
  navOpen?: boolean;
  onMenuClick?: () => void;
};

/** 内容区顶栏 — 全宽 h-[57px] 框架 + 搜索区 flex-1 撑满。 */
export function Header({ navOpen = false, onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useRouteContext({ from: '/_app' });
  const displayName = user?.displayName || user?.name || '';
  const generatedSeed = parseGeneratedAvatarMarker(user?.image);
  const uploadedImage = user?.image && !generatedSeed ? user.image : null;

  return (
    <header className="app-chrome-header relative z-20 w-full shrink-0 border-b border-hairline [--node-horizontal-offset:-3.5px]">
      <FrameNode pos="bottom-left" className="hidden lg:block" />
      <FrameNode pos="bottom-right" className="hidden lg:block" />

      <div className="flex h-[57px] w-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
        {onMenuClick ? (
          <button
            type="button"
            aria-label={navOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={navOpen}
            aria-haspopup="dialog"
            className="app-icon-btn inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-hairline lg:hidden"
            onClick={onMenuClick}
          >
            <Menu size={16} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => toast.info('搜索功能即将开放')}
          className="app-input-field app-mono flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-hairline bg-surface/80 px-2.5 text-left text-ink-faint sm:px-3"
        >
          <Search size={14} className="shrink-0" />
          <span className="truncate text-[12px] sm:text-[13px]">
            <span className="sm:hidden">{t('header.searchShort', { defaultValue: '搜索' })}</span>
            <span className="hidden sm:inline">{t('header.searchPlaceholder')}</span>
          </span>
          <span className="app-mono ml-auto hidden shrink-0 rounded border border-hairline px-1.5 py-0.5 text-[10px] text-ink-faint sm:inline">
            /
          </span>
        </button>

        <span aria-hidden className="hidden h-5 w-px shrink-0 bg-hairline sm:block" />

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle className="lp-nav-link inline-flex size-8 items-center justify-center rounded-md" iconSize={15} />
          <button
            type="button"
            onClick={() => toast.info('通知功能即将开放')}
            className="app-icon-btn relative inline-flex size-8 items-center justify-center rounded-md"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-peach" />
          </button>
          <Link
            to="/account"
            className="app-icon-btn inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1.5 sm:px-2"
            title={displayName}
          >
            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt={displayName}
                className="size-5 shrink-0 rounded-[5px] object-cover"
              />
            ) : generatedSeed ? (
              <span className="size-5 shrink-0 overflow-hidden rounded-[5px]">
                <Avatar
                  name={generatedSeed}
                  variant="beam"
                  colors={['#2E2A26', '#7A6248', '#F0C3A3', '#A9C0A0', '#A8C4D6']}
                  size={20}
                  square
                />
              </span>
            ) : (
              <User size={15} className="shrink-0" />
            )}
            {displayName ? (
              <span className="app-mono hidden max-w-[10ch] truncate text-[12px] sm:inline">
                {displayName}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
