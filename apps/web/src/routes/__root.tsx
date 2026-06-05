import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
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
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar — fixed 220 px, strong glass */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
    <div className="grid min-h-dvh place-items-center text-gray-500">
      {t('health.loading')}
    </div>
  );
}

function RootError({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center text-red-500">
      {t('health.error')}: {error.message}
    </div>
  );
}
