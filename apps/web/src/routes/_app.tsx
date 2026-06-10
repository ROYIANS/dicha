import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { DEV_USER, shouldBypassAuth } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { AppNavDrawer } from '@/components/AppNavDrawer';
import { Header } from '@/components/Header';
import { InputBar } from '@/components/InputBar';

/**
 * Pathless layout route — groups pages that require authentication.
 * URL paths of child routes are NOT prefixed with `_app`.
 * Also provides the full app chrome (Sidebar, Header, InputBar).
 *
 * beforeLoad:
 *   - shouldBypassAuth() → inject DEV_USER into context, allow through.
 *   - Otherwise → redirect to landing (real Casdoor guard is a separate task).
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (shouldBypassAuth()) {
      return { user: DEV_USER };
    }
    throw redirect({ to: '/' });
  },
  component: AppLayout,
});

function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-canvas lg:bg-sidebar-bg">
      <Sidebar />
      <AppNavDrawer open={navOpen} onOpenChange={setNavOpen} />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas lg:rounded-l-2xl lg:shadow-float">
        <div aria-hidden className="app-shell-noise" />
        <Header navOpen={navOpen} onMenuClick={() => setNavOpen((v) => !v)} />

        <div className="relative z-[1] min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>

        <InputBar />
      </div>
    </div>
  );
}
