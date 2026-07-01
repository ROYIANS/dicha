import { queryOptions } from '@tanstack/react-query';
import {
  AiConfigUpdateResponseSchema,
  AiGatewayCatalogSchema,
  AiProviderCheckResponseSchema,
  AiProviderSyncModelsResponseSchema,
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

export async function syncAiProviderModels(providerId: string) {
  const res = await api.ai.syncProviderModels({ body: { providerId } });
  if (res.status === 200) {
    return AiProviderSyncModelsResponseSchema.parse(res.body);
  }
  throw new Error(`AI provider model sync failed (${res.status})`);
}

export async function checkAiProviderConnection(providerId: string) {
  const res = await api.ai.checkProviderConnection({ body: { providerId } });
  if (res.status === 200) {
    return AiProviderCheckResponseSchema.parse(res.body);
  }
  throw new Error(`AI provider connection check failed (${res.status})`);
}
