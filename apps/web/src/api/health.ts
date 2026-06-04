import { queryOptions } from '@tanstack/react-query';
import { api } from './client';

/**
 * Reusable query factory: one object shared by the route loader
 * (`queryClient.ensureQueryData`) and the component (`useQuery`).
 * This is the loader-first contract (architecture.md §2, hook-guidelines).
 * queryFn returns the unwrapped body — `{ status, db }`.
 */
export const healthQueryOptions = () =>
  queryOptions({
    queryKey: ['health'] as const, // domain-first key
    queryFn: async ({ signal }) => {
      const res = await api.getHealth({ fetchOptions: { signal } });
      if (res.status === 200) {
        return res.body;
      }
      throw new Error(`health request failed (${res.status})`);
    },
  });
