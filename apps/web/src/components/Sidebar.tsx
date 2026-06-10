import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Shirt, BookOpen, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppBrand } from '@/components/AppBrand';
import { EdgeRuler } from '@/components/EdgeRuler';

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

type NavVariant = 'sidebar' | 'canvas';

function navLinkClass(active: boolean, variant: NavVariant, disabled?: boolean) {
  const base =
    variant === 'sidebar'
      ? 'app-sidebar-link flex h-8 items-center gap-2.5 px-2.5 rounded-md text-sm font-medium'
      : 'lp-drawer-link flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium';

  if (disabled) {
    return variant === 'sidebar'
      ? `${base} text-sidebar-ink-soft opacity-50 cursor-not-allowed`
      : `${base} text-ink-faint opacity-50 cursor-not-allowed`;
  }

  if (variant === 'sidebar') {
    return active ? `${base} app-sidebar-link-active` : `${base} text-sidebar-ink-soft`;
  }

  return active ? `${base} bg-surface-alt text-ink` : `${base} text-ink-soft`;
}

function NavLink({
  item,
  active,
  onNavigate,
  variant,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  variant: NavVariant;
}) {
  const cls = navLinkClass(active, variant, item.disabled);

  if (item.disabled) {
    return (
      <div className={cls} title="即将开放">
        <span className="size-4 shrink-0 opacity-70">{item.icon}</span>
        <span className="app-mono truncate">{item.label}</span>
        <span className="app-mono ml-auto shrink-0 text-[10px] tracking-wide text-sidebar-ink-soft">即将</span>
      </div>
    );
  }

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          item.onClick?.();
          onNavigate?.();
        }}
        className={`${cls} w-full text-left`}
      >
        <span className="size-4 shrink-0">{item.icon}</span>
        <span className="app-mono truncate">{item.label}</span>
      </button>
    );
  }

  if (item.to) {
    return (
      <Link to={item.to} onClick={onNavigate} className={cls}>
        <span className="size-4 shrink-0">{item.icon}</span>
        <span className="app-mono truncate">{item.label}</span>
      </Link>
    );
  }

  return null;
}

type SidebarNavProps = {
  className?: string;
  onNavigate?: () => void;
  variant?: NavVariant;
};

/** 侧栏导航内容 — 桌面侧栏与移动 drawer 共用。 */
export function SidebarNav({ className = '', onNavigate, variant = 'sidebar' }: SidebarNavProps) {
  const { t } = useTranslation();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const sections: NavSection[] = [
    {
      title: t('nav.dashboard'),
      items: [
        {
          label: t('nav.dashboard'),
          icon: <LayoutDashboard size={15} />,
          to: '/home',
        },
      ],
    },
    {
      title: t('nav.rooms'),
      items: [
        {
          label: t('nav.wardrobe'),
          icon: <Shirt size={15} />,
          to: '/wardrobe',
          disabled: true,
        },
        {
          label: t('nav.library'),
          icon: <BookOpen size={15} />,
          to: '/library',
          disabled: true,
        },
        {
          label: t('nav.storage'),
          icon: <Package size={15} />,
          to: '/storage-room',
        },
      ],
    },
  ];

  const sectionClass =
    variant === 'sidebar'
      ? 'app-sidebar-section'
      : 'app-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

  const worldCard =
    variant === 'sidebar' ? (
      <div className="app-sidebar-world mx-3 mb-3 overflow-hidden rounded-lg border border-white/10">
        <div className="p-3">
          <div className="app-mono text-[13px] font-semibold text-sidebar-ink">{t('sidebar.pixelWorld')}</div>
          <div className="app-mono mt-1 text-[11px] leading-relaxed text-sidebar-ink-soft">{t('sidebar.pixelWorldDesc')}</div>
          <Link
            to="/world"
            onClick={onNavigate}
            className="app-mono app-sidebar-world-btn mt-2.5 block rounded-md py-1.5 text-center text-[11px] font-medium text-sidebar-ink"
          >
            {t('dashboard.enterWorld')}
          </Link>
        </div>
      </div>
    ) : (
      <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-hairline bg-surface-alt">
        <div className="p-3">
          <div className="app-mono text-sm font-semibold text-ink">{t('sidebar.pixelWorld')}</div>
          <div className="app-mono mt-0.5 text-xs text-ink-soft">{t('sidebar.pixelWorldDesc')}</div>
          <Link
            to="/world"
            onClick={onNavigate}
            className="lp-btn lp-btn-primary app-mono mt-2 inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-medium"
          >
            {t('dashboard.enterWorld')}
          </Link>
        </div>
      </div>
    );

  return (
    <div className={className}>
      <nav className="space-y-4 px-2.5 py-3">
        {sections.map((section, idx) => (
          <div key={section.title} className={idx > 0 && variant === 'sidebar' ? 'border-t border-white/8 pt-4' : ''}>
            <div className={`mb-1.5 px-2.5 ${sectionClass}`}>{section.title}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  active={item.to !== undefined && location === item.to}
                  onNavigate={onNavigate}
                  variant={variant}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {worldCard}
    </div>
  );
}

const SIDEBAR_RAIL = 'color-mix(in oklab, var(--sidebar-ink) 14%, transparent)';

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="app-sidebar app-shell relative hidden h-full w-[var(--app-sidebar-w)] shrink-0 flex-col overflow-hidden bg-sidebar-bg lg:flex">
      <div aria-hidden className="app-sidebar-noise pointer-events-none absolute inset-0" />
      <EdgeRuler
        segs={[{ f: 2.4 }, { f: 3.2, dash: true }, { f: 2.1 }, { f: 1.8, dash: true }, { f: 2.6 }]}
        side="right"
        color={SIDEBAR_RAIL}
        className="z-[1]"
      />

      <div className="relative border-b border-white/8 px-4 py-4">
        <AppBrand variant="sidebar" to="/home" />
        <p className="app-mono mt-2 text-[11px] leading-relaxed text-sidebar-ink-soft">{t('app.tagline')}</p>
      </div>

      <SidebarNav className="relative z-[1] flex-1 overflow-y-auto" variant="sidebar" />
    </aside>
  );
}
