import { createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient();

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent', // hover/touch prefetch (architecture.md §2)
  defaultErrorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-danger">{error.message}</div>
  ),
  scrollRestoration: true,
});

// App-wide type-safe router.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
