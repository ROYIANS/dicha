import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export interface RouterContext {
  queryClient: QueryClient;
  // auth seam (architecture.md §3): a future `beforeLoad` guard reads it.
  // Left off the shape for M1 — extend when the BFF lands.
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  pendingComponent: RootPending,
  errorComponent: RootError,
});

function RootComponent() {
  return <Outlet />;
}

function RootPending() {
  const { t } = useTranslation();
  return <div className="grid min-h-dvh place-items-center text-muted">{t('health.loading')}</div>;
}

function RootError({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center text-danger">
      {t('health.error')}: {error.message}
    </div>
  );
}
