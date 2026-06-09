import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
  return <Outlet />;
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
