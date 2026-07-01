import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ErrorStateScene } from '@/components/ErrorStateScene';
import { UmamiAnalytics } from '@/components/UmamiAnalytics';
import { type UserDto } from '@dicha/shared';

export interface RouterContext {
  queryClient: QueryClient;
  user?: UserDto;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  pendingComponent: RootPending,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});

function RootComponent() {
  return (
    <>
      <UmamiAnalytics />
      <Outlet />
    </>
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
  return <ErrorStateScene variant="error" errorMessage={error.message} />;
}

function RootNotFound() {
  return <ErrorStateScene variant="not-found" />;
}
