import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Shirt,
  BookOpen,
  Package,
  Search,
  Globe,
  Settings,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from './GlassPanel';

/** Union of all registered route paths — matches FileRouteTypes['to'] in routeTree.gen.ts */
type AppRoute = '/' | '/storage-room' | '/wardrobe' | '/library' | '/world';

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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const baseClass =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors';

  if (item.disabled) {
    return (
      <div
        className={`${baseClass} opacity-40 cursor-not-allowed`}
        title="即将开放"
      >
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
        <span>{item.label}</span>
        <span className="ml-auto text-xs opacity-70">即将</span>
      </div>
    );
  }

  if (item.onClick) {
    return (
      <button
        onClick={item.onClick}
        className={`${baseClass} w-full text-left hover:bg-white/20 text-gray-700`}
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
        className={`${baseClass} ${
          active
            ? 'bg-white/30 text-violet-700 shadow-sm'
            : 'text-gray-700 hover:bg-white/20'
        }`}
      >
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  }

  return null;
}

export function Sidebar() {
  const { t } = useTranslation();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const sections: NavSection[] = [
    {
      title: t('nav.dashboard'),
      items: [
        {
          label: t('nav.dashboard'),
          icon: <LayoutDashboard size={16} />,
          to: '/',
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
    {
      title: t('nav.tools'),
      items: [
        {
          label: t('nav.search'),
          icon: <Search size={16} />,
          onClick: () => toast.info('搜索功能即将开放'),
        },
      ],
    },
    {
      title: t('nav.world'),
      items: [
        {
          label: t('nav.world'),
          icon: <Globe size={16} />,
          to: '/world',
        },
      ],
    },
  ];

  return (
    <GlassPanel
      variant="strong"
      className="w-[220px] shrink-0 flex flex-col h-full rounded-none border-r border-white/20 overflow-hidden"
    >
      {/* Logo area */}
      <div className="px-4 py-5 border-b border-white/20">
        <div className="text-lg font-bold text-violet-800 tracking-tight">vidorra</div>
        <div className="text-xs text-gray-500 mt-0.5">{t('app.tagline')}</div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  active={item.to !== undefined && location === item.to}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="border-t border-white/20 px-3 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs shrink-0">
          <User size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">Royians</div>
          <div className="text-xs text-gray-400">{t('user.level', { level: 18 })}</div>
        </div>
        <button
          onClick={() => toast.info('设置功能即将开放')}
          className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-gray-500 transition-colors"
          title={t('nav.settings')}
        >
          <Settings size={14} />
        </button>
      </div>
    </GlassPanel>
  );
}
