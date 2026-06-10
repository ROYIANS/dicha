import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Shirt, BookOpen, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Union of all registered route paths — matches FileRouteTypes['to'] in routeTree.gen.ts */
type AppRoute = '/home' | '/storage-room' | '/wardrobe' | '/library' | '/world';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  to?: AppRoute;
  disabled?: boolean;
  onClick?: () => void;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const baseClass =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors';

  if (item.disabled) {
    return (
      <div
        className={`${baseClass} text-sidebar-ink-soft opacity-50 cursor-not-allowed`}
        title="即将开放"
      >
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
        <span>{item.label}</span>
        <span className="ml-auto text-xs">即将</span>
      </div>
    );
  }

  if (item.onClick) {
    return (
      <button
        onClick={() => {
          item.onClick?.();
          onNavigate?.();
        }}
        className={`${baseClass} w-full text-left text-sidebar-ink-soft hover:bg-[var(--sidebar-hover)]`}
      >
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
        <span>{item.label}</span>
      </button>
    );
  }

  if (item.to) {
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        className={`${baseClass} ${
          active
            ? 'bg-[var(--sidebar-active)] text-sidebar-ink'
            : 'text-sidebar-ink-soft hover:bg-[var(--sidebar-hover)]'
        }`}
      >
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  }

  return null;
}

type SidebarNavProps = {
  className?: string;
  onNavigate?: () => void;
};

/** 侧栏导航内容 — 桌面侧栏与移动 drawer 共用。 */
export function SidebarNav({ className = '', onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const sections: NavSection[] = [
    {
      title: t('nav.dashboard'),
      items: [
        {
          label: t('nav.dashboard'),
          icon: <LayoutDashboard size={16} />,
          to: '/home',
        },
      ],
    },
    {
      title: t('nav.rooms'),
      items: [
        {
          label: t('nav.wardrobe'),
          icon: <Shirt size={16} />,
          to: '/wardrobe',
          disabled: true,
        },
        {
          label: t('nav.library'),
          icon: <BookOpen size={16} />,
          to: '/library',
          disabled: true,
        },
        {
          label: t('nav.storage'),
          icon: <Package size={16} />,
          to: '/storage-room',
        },
      ],
    },
  ];

  return (
    <div className={className}>
      <nav className="px-3 py-2 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1 text-xs font-semibold text-sidebar-ink-soft uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  active={item.to !== undefined && location === item.to}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="m-3 rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3a2f24, #241c14)' }}
      >
        <div className="p-3">
          <div className="text-sm font-semibold text-sidebar-ink">{t('sidebar.pixelWorld')}</div>
          <div className="text-xs text-sidebar-ink-soft mt-0.5">{t('sidebar.pixelWorldDesc')}</div>
          <Link
            to="/world"
            onClick={onNavigate}
            className="mt-2 block text-center py-1.5 rounded-lg bg-[var(--sidebar-active)] text-sidebar-ink text-xs hover:bg-[var(--sidebar-hover)]"
          >
            {t('dashboard.enterWorld')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 flex-col h-full bg-sidebar-bg overflow-hidden">
      <div className="px-5 py-5">
        <div className="text-xl text-sidebar-ink tracking-tight">vidorra</div>
        <div className="text-xs text-sidebar-ink-soft mt-1">{t('app.tagline')}</div>
      </div>
      <SidebarNav className="flex-1 overflow-y-auto" />
    </aside>
  );
}
