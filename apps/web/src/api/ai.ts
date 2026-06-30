import { queryOptions } from '@tanstack/react-query';
import { aiCatalogFixture } from '@dicha/shared';

export const aiCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ['ai', 'catalog'] as const,
    queryFn: async () => ({
      ...aiCatalogFixture,
      generatedAt: new Date().toISOString(),
    }),
    staleTime: 5 * 60 * 1000,
  });
