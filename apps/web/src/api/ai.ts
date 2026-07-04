import { queryOptions } from '@tanstack/react-query';
import {
  AiConfigUpdateResponseSchema,
  AiGatewayCatalogSchema,
  AiInvokeResponseSchema,
  AiProviderCheckResponseSchema,
  AiProviderSyncModelsResponseSchema,
  AiUsageReportSchema,
  type AiConfigUpdate,
  type AiInvokeRequest,
  type AiInvokeResponse,
  type AiUsageWindow,
} from '@dicha/shared';
import { api } from './client';
import { env } from '@/lib/env';
import { streamAiInvokeEvents, type AiInvokeStreamHandlers } from './ai-stream';

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

export const aiUsageQueryOptions = (window: AiUsageWindow) =>
  queryOptions({
    queryKey: ['ai', 'usage', window] as const,
    queryFn: async ({ signal }) => {
      const res = await api.ai.getUsage({ query: { window }, fetchOptions: { signal } });
      if (res.status === 200) {
        return AiUsageReportSchema.parse(res.body);
      }
      throw new Error(`AI usage request failed (${res.status})`);
    },
    staleTime: 60 * 1000,
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

export async function invokeAi(body: AiInvokeRequest): Promise<AiInvokeResponse> {
  const res = await api.ai.invoke({ body });
  if (res.status === 200) {
    return AiInvokeResponseSchema.parse(res.body);
  }
  throw new Error(`AI invoke failed (${res.status})`);
}

export async function invokeAiStream(
  body: AiInvokeRequest,
  handlers: AiInvokeStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  await streamAiInvokeEvents(
    {
      url: `${env.VITE_API_BASE_URL}/ai/invoke/stream`,
      body,
      credentials: 'include',
      signal,
    },
    handlers,
  );
}
