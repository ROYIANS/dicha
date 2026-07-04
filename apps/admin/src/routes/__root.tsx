import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { type UserDto } from '@dicha/shared';

export interface RouterContext {
  queryClient: QueryClient;
  user?: UserDto;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  pendingComponent: RootPending,
});

function RootPending() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas text-sm text-ink-soft">
      {t('loading')}
    </div>
  );
}
