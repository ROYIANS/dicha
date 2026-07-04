import {
  getRouteApi,
  Link,
  Outlet,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  Coins,
  Database,
  FileClock,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  Settings2,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { logout } from '@/api/auth';
import { BrandMark } from '@/components/AppBrand';

const adminRoute = getRouteApi('/_admin');

const navSections = [
  {
    title: '总览',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: '用户与权限',
    items: [
      { to: '/basic', label: '用户管理', icon: UsersRound },
      { label: '角色与权限', icon: ShieldCheck, planned: true },
      { label: '内容与资源', icon: Boxes, planned: true },
    ],
  },
  {
    title: 'AI 与服务',
    items: [
      { to: '/ai-providers', label: '供应商渠道', icon: Bot },
      { to: '/dicha-ai', label: 'DicHA AI 服务', icon: Database },
      { to: '/ai-invoke-test', label: 'AI 调用测试', icon: Activity },
      { label: '模型与用途', icon: Database, planned: true },
    ],
  },
  {
    title: '积分与计费',
    items: [
      { to: '/credits/rules', label: '积分规则', icon: Coins },
      { to: '/credits/grants', label: '积分发放', icon: Gift },
      { to: '/credits/balances', label: '账户余额', icon: WalletCards },
      { to: '/credits/ledger', label: '积分流水', icon: ReceiptText },
      { to: '/credits/redemption-codes', label: '兑换码', icon: Gift },
    ],
  },
  {
    title: '系统运营',
    items: [
      { to: '/system', label: '系统功能', icon: Settings2 },
      { to: '/analytics', label: '统计看板', icon: BarChart3 },
      { label: '审计日志', icon: FileClock, planned: true },
    ],
  },
] as const;

type AdminNavItem = {
  label: string;
  icon: LucideIcon;
  planned?: boolean;
  to?:
    | '/'
    | '/basic'
    | '/ai-providers'
    | '/dicha-ai'
    | '/ai-invoke-test'
    | '/credits/rules'
    | '/credits/grants'
    | '/credits/balances'
    | '/credits/ledger'
    | '/credits/redemption-codes'
    | '/system'
    | '/analytics';
};

export function AdminShell() {
  const router = useRouter();
  const { user } = adminRoute.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    await router.navigate({ to: '/login' });
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-sidebar-bg text-ink">
      <aside className="hidden w-[236px] shrink-0 flex-col px-3 py-4 text-sidebar-ink lg:flex">
        <AdminSidebarContent
          user={user}
          pathname={pathname}
          onNavigate={() => undefined}
          onLogout={handleLogout}
        />
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="关闭导航"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(82vw,280px)] flex-col bg-sidebar-bg px-3 py-4 text-sidebar-ink shadow-float">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label="关闭导航"
                onClick={() => setMobileNavOpen(false)}
                className="grid size-9 place-items-center rounded-md bg-white/10 text-sidebar-ink transition-colors hover:bg-white/15"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>
            <AdminSidebarContent
              user={user}
              pathname={pathname}
              onNavigate={() => setMobileNavOpen(false)}
              onLogout={async () => {
                setMobileNavOpen(false);
                await handleLogout();
              }}
            />
          </aside>
        </div>
      ) : null}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas shadow-float lg:rounded-l-md">
        <div className="admin-noise" aria-hidden />
        <header className="relative z-[1] flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface/90 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="打开导航"
              onClick={() => setMobileNavOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-ink transition-colors hover:bg-canvas lg:hidden"
            >
              <Menu className="size-4" strokeWidth={1.8} />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-ink-soft">Admin Console</p>
              <p className="truncate text-sm font-semibold text-ink">超级管理员管理系统</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink-soft sm:flex">
            <Activity className="size-3.5 text-sage" strokeWidth={1.8} />
            API protected
          </div>
        </header>

        <div className="relative z-[1] min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AdminSidebarContent({
  user,
  pathname,
  onNavigate,
  onLogout,
}: {
  user: { name: string; email: string };
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="grid size-9 place-items-center rounded-md bg-white/10 text-sidebar-ink">
          <BrandMark className="h-4 w-[24px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">滴茶 Admin</p>
          <p className="truncate text-[11px] text-sidebar-ink-soft">Super Admin Console</p>
        </div>
      </div>

      <nav className="mt-7 space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-ink-soft/70">
              {section.title}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-md border border-white/10 bg-white/[0.04] p-3">
        <p className="truncate text-xs font-medium">{user.name}</p>
        <p className="mt-1 truncate text-[11px] text-sidebar-ink-soft">{user.email}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs text-sidebar-ink transition-colors hover:bg-white/15"
        >
          <LogOut className="size-3.5" strokeWidth={1.7} />
          退出登录
        </button>
      </div>
    </>
  );
}

function SidebarNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  if (!item.to || item.planned) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-sidebar-ink-soft/50"
      >
        <Icon className="size-4" strokeWidth={1.7} />
        <span>{item.label}</span>
        <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-sidebar-ink-soft/70">
          稍后
        </span>
      </button>
    );
  }

  const active = pathname === item.to;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="admin-sidebar-link flex items-center gap-2 rounded-md px-2.5 py-2 text-sm"
      activeProps={{ className: 'bg-[var(--sidebar-active)] text-sidebar-ink' }}
      inactiveProps={{ className: 'text-sidebar-ink-soft' }}
      activeOptions={{ exact: item.to === '/' }}
    >
      <Icon className="size-4" strokeWidth={1.7} />
      <span>{item.label}</span>
      {active ? <span className="ml-auto size-1.5 rounded-full bg-peach" /> : null}
    </Link>
  );
}
