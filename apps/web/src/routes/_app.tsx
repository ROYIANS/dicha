import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { DEV_USER, shouldBypassAuth } from '@/lib/auth';
import { authQueryOptions } from '@/api/auth';
import { Sidebar } from '@/components/Sidebar';
import { AppNavDrawer } from '@/components/AppNavDrawer';
import { Header } from '@/components/Header';
import { InputBar } from '@/components/InputBar';
import { MobileActionSheet } from '@/components/MobileActionSheet';
import { MobileTabBar } from '@/components/MobileTabBar';

/**
 * Pathless layout route — groups pages that require authentication.
 * URL paths of child routes are NOT prefixed with `_app`.
 * Also provides the full app chrome (Sidebar, Header, InputBar).
 *
 * beforeLoad:
 *   - shouldBypassAuth() → inject DEV_USER into context, allow through.
 *   - Otherwise → ensureQueryData(authQueryOptions()), redirect to /login on 401.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    if (shouldBypassAuth()) {
      return { user: DEV_USER };
    }

    try {
      const user = await context.queryClient.ensureQueryData(authQueryOptions());
      return { user };
    } catch {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-canvas lg:bg-sidebar-bg">
      <Sidebar />
      <AppNavDrawer open={navOpen} onOpenChange={setNavOpen} />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas lg:rounded-l-2xl lg:shadow-float">
        <div aria-hidden className="app-shell-noise" />
        <div className="hidden lg:block">
          <Header navOpen={navOpen} onMenuClick={() => setNavOpen((v) => !v)} />
        </div>

        <div className="app-content-scroll relative z-[1] min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>

        <InputBar />
        <MobileTabBar
          actionsOpen={mobileActionsOpen}
          onAddClick={() => setMobileActionsOpen((value) => !value)}
        />
        <MobileActionSheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen} />
      </div>
    </div>
  );
}
