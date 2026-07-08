import { Link, useRouterState } from '@tanstack/react-router';
import {
  House,
  LayoutDashboard,
  Package,
  Plus,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HeroButton } from '@/components/HeroControls';

type MobileTabBarProps = {
  actionsOpen: boolean;
  onAddClick: () => void;
};

type MobileTabItem = {
  label: string;
  to: '/home' | '/storage-room' | '/settings';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active: (pathname: string) => boolean;
};

export function MobileTabBar({ actionsOpen, onAddClick }: MobileTabBarProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs: MobileTabItem[] = [
    {
      label: t('nav.dashboard'),
      to: '/home',
      icon: LayoutDashboard,
      active: (path) => path === '/home',
    },
    {
      label: t('nav.collect'),
      to: '/storage-room',
      icon: Package,
      active: (path) => path === '/storage-room',
    },
    {
      label: t('nav.rooms'),
      to: '/storage-room',
      icon: House,
      active: (path) => path === '/wardrobe' || path === '/library',
    },
    {
      label: t('nav.me'),
      to: '/settings',
      icon: UserRound,
      active: (path) => path === '/settings' || path.startsWith('/settings/') || path === '/account',
    },
  ];

  const renderTab = (tab: MobileTabItem) => {
    const Icon = tab.icon;
    const active = tab.active(pathname);

    return (
      <Link
        key={tab.label}
        to={tab.to}
        className="app-mobile-tabbar-item"
        data-active={active ? 'true' : undefined}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={19} />
        <span>{tab.label}</span>
      </Link>
    );
  };

  return (
    <nav className="app-mobile-tabbar lg:hidden" aria-label={t('nav.mobilePrimary')}>
      <div className="app-mobile-tabbar-inner">
        {tabs.slice(0, 2).map(renderTab)}
        <HeroButton
          type="button"
          className="app-mobile-tabbar-add"
          aria-label={t('inputBar.add')}
          aria-expanded={actionsOpen}
          onClick={onAddClick}
        >
          <Plus size={20} />
        </HeroButton>
        {tabs.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
