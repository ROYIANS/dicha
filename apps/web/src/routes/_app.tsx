import { createFileRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { useLayoutEffect, useRef, useState } from 'react';
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
 *   - ensureQueryData(authQueryOptions()), redirect to /login on 401.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
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
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useLayoutEffect(() => {
    const scrollEl = contentScrollRef.current;
    if (scrollEl) {
      scrollEl.scrollTop = 0;
      scrollEl.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-canvas lg:bg-sidebar-bg">
      <Sidebar />
      <AppNavDrawer open={navOpen} onOpenChange={setNavOpen} />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas lg:rounded-l-2xl lg:shadow-float">
        <div aria-hidden className="app-shell-noise" />
        <div className="hidden lg:block">
          <Header navOpen={navOpen} onMenuClick={() => setNavOpen((v) => !v)} />
        </div>

        <div
          ref={contentScrollRef}
          className="app-content-scroll relative z-[1] min-h-0 flex-1 overflow-auto"
        >
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
