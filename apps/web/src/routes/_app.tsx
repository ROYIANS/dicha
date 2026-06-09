import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { DEV_USER } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { InputBar } from '@/components/InputBar';

/**
 * Pathless layout route — groups pages that require authentication.
 * URL paths of child routes are NOT prefixed with `_app`.
 * Also provides the full app chrome (Sidebar, Header, InputBar).
 *
 * beforeLoad:
 *   - VITE_DEV_BYPASS_AUTH=true → inject DEV_USER into context, allow through.
 *   - Otherwise → redirect to /login (stub; real Casdoor integration is a separate task).
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      return { user: DEV_USER };
    }
    // Real auth guard placeholder — redirect to landing page when bypass is off.
    throw redirect({ to: '/' });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-sidebar-bg">
      {/* Sidebar — fixed 220 px, dark chrome */}
      <Sidebar />

      {/* Content panel — floats above dark sidebar via left rounding + shadow */}
      <div className="flex-1 min-w-0 flex flex-col bg-canvas rounded-l-[20px] shadow-float overflow-hidden">
        <Header />

        {/* Scrollable page area */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>

        {/* Fixed-to-bottom input bar */}
        <InputBar />
      </div>
    </div>
  );
}
