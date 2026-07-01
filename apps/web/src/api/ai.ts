import { queryOptions } from '@tanstack/react-query';
import {
  AiConfigUpdateResponseSchema,
  AiGatewayCatalogSchema,
  type AiConfigUpdate,
} from '@dicha/shared';
import { api } from './client';

export const aiCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ['ai', 'catalog'] as const,
    queryFn: async ({ signal }) => {
      const res = await api.ai.getCatalog({ fetchOptions: { signal } });
      if (res.status === 200) {
        return AiGatewayCatalogSchema.parse(res.body);
      }
      throw new Error(`AI catalog request failed (${res.status})`);
    },
    staleTime: 5 * 60 * 1000,
  });

export async function updateAiConfig(body: AiConfigUpdate) {
  const res = await api.ai.updateConfig({ body });
  if (res.status === 200) {
    return AiConfigUpdateResponseSchema.parse(res.body).catalog;
  }
  throw new Error(`AI config update failed (${res.status})`);
}
