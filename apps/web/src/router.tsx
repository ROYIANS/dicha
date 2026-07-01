import { createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { ErrorStateScene } from '@/components/ErrorStateScene';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined;
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent', // hover/touch prefetch (architecture.md §2)
  defaultErrorComponent: ({ error }) => (
    <ErrorStateScene variant="error" errorMessage={getErrorMessage(error)} />
  ),
  defaultNotFoundComponent: () => <ErrorStateScene variant="not-found" />,
  scrollRestoration: true,
});

// App-wide type-safe router.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
