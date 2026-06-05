import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { InputBar } from '@/components/InputBar';

export interface RouterContext {
  queryClient: QueryClient;
  // auth seam: `_app.tsx` beforeLoad injects the resolved user here.
  // Kept off the root shape until real auth lands; dev bypass injects via _app context return.
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  pendingComponent: RootPending,
  errorComponent: RootError,
});

function RootComponent() {
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

function RootPending() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center text-ink-soft">
      {t('health.loading')}
    </div>
  );
}

function RootError({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center text-pink">
      {t('health.error')}: {error.message}
    </div>
  );
}
