/// <reference types="vitest/globals" />

import type { AiGatewayCatalog, AiInvokeRequest, AiModel, AiProvider } from '@dicha/shared';
import type { CatalogStore, SystemProviderChannel } from '../catalog/catalog.store';
import type { CreditStore } from '../credits/credit.store';
import type { UsageStore } from '../usage/usage.store';
import type { InvokeAdapterRegistry } from './adapters/invoke-adapter.registry';
import { InvokeError } from './adapters/invoke-error';

vi.mock('../catalog/catalog.store', () => ({ CatalogStore: class CatalogStore {} }));
vi.mock('../credits/credit.store', () => ({ CreditStore: class CreditStore {} }));
vi.mock('../usage/usage.store', () => ({ UsageStore: class UsageStore {} }));

describe('InvokeService official channel degradation', () => {
  test('retries another DicHA channel and settles credits only for the successful attempt', async () => {
    const catalogStore = {
      getCatalog: vi.fn(async () => catalog),
      getSystemProviderChannels: vi.fn(async () => channels),
      getProviderSecret: vi.fn(),
    } as unknown as CatalogStore;
    const creditStore = {
      assertSufficientReserve: vi.fn(async () => undefined),
      calculateCharge: vi.fn(async () => ({
        amount: 3,
        costAmount: 0.0014,
        costCurrency: 'CNY',
        snapshot: { rule: { id: 'rule-1' }, creditAmount: 3 },
      })),
    } as unknown as CreditStore;
    const usageStore = {
      recordEvent: vi.fn(async (_ownerId: string, record: unknown) => record),
    } as unknown as UsageStore;
    const invoke = vi.fn(async (context: { model: { name: string } }) => {
      if (context.model.name === 'upstream-a') {
        throw new InvokeError('provider_unavailable', 'temporary upstream failure', true);
      }
      return {
        text: 'fallback channel response',
        promptTokens: 100,
        completionTokens: 20,
        upstreamRequestId: 'upstream-req-b',
      };
    });
    const adapterRegistry = {
      adapterFor: vi.fn(() => ({ invoke })),
    } as unknown as InvokeAdapterRegistry;

    const { InvokeService } = await import('./invoke.service');
    const response = await new InvokeService(
      catalogStore,
      creditStore,
      usageStore,
      adapterRegistry,
    ).invoke('user-1', request);

    expect(response.status).toBe('degraded');
    expect(response.degraded).toBe(true);
    expect(response.text).toBe('fallback channel response');
    expect(response.usage).toMatchObject({
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      creditAmount: 3,
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
    });
    expect(response.attempts).toHaveLength(2);
    expect(response.attempts[0]).toMatchObject({
      status: 'failure',
      errorCategory: 'provider_unavailable',
    });
    expect(response.attempts[1]).toMatchObject({
      status: 'degraded',
      errorCategory: null,
    });
    expect(creditStore.assertSufficientReserve).toHaveBeenCalledTimes(2);
    expect(creditStore.calculateCharge).toHaveBeenCalledTimes(1);
    expect(usageStore.recordEvent).toHaveBeenCalledTimes(1);
    expect(usageStore.recordEvent).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        status: 'degraded',
        providerId: 'dicha',
        modelId: 'dicha:assistant-pro',
        creditAmount: 3,
        billingMode: 'platform_credits',
        upstreamRequestId: 'upstream-req-b',
        internalProviderId: 'internal-b',
        internalProviderModelId: 'channel-b',
        estimatedCostAmount: 0.0014,
        estimatedCostCurrency: 'CNY',
        estimatedCostUsd: 0,
      }),
    );
  });

  test('streams through a fallback DicHA channel and settles credits after final output', async () => {
    const catalogStore = {
      getCatalog: vi.fn(async () => catalog),
      getSystemProviderChannels: vi.fn(async () => channels),
      getProviderSecret: vi.fn(),
    } as unknown as CatalogStore;
    const creditStore = {
      assertSufficientReserve: vi.fn(async () => undefined),
      calculateCharge: vi.fn(async () => ({
        amount: 4,
        costAmount: 0.0015,
        costCurrency: 'CNY',
        snapshot: { rule: { id: 'rule-1' }, creditAmount: 4 },
      })),
    } as unknown as CreditStore;
    const usageStore = {
      recordEvent: vi.fn(async (_ownerId: string, record: unknown) => record),
    } as unknown as UsageStore;
    const stream = vi.fn(
      async (
        context: { model: { name: string } },
        onDelta: (delta: { text: string }) => void | Promise<void>,
      ) => {
        if (context.model.name === 'upstream-a') {
          throw new InvokeError('provider_unavailable', 'temporary stream failure', true);
        }
        await onDelta({ text: 'hello' });
        await onDelta({ text: ' stream' });
        return {
          text: 'hello stream',
          promptTokens: 80,
          completionTokens: 12,
          upstreamRequestId: 'upstream-stream-b',
        };
      },
    );
    const adapterRegistry = {
      adapterFor: vi.fn(() => ({ stream })),
    } as unknown as InvokeAdapterRegistry;
    const events: unknown[] = [];

    const { InvokeService } = await import('./invoke.service');
    await new InvokeService(catalogStore, creditStore, usageStore, adapterRegistry).stream(
      'user-1',
      request,
      {
        emit: (event) => {
          events.push(event);
        },
      },
    );

    expect(events.map((event) => (event as { type: string }).type)).toEqual([
      'start',
      'attempt',
      'start',
      'delta',
      'delta',
      'attempt',
      'final',
    ]);
    expect(events.filter((event) => (event as { type: string }).type === 'delta')).toEqual([
      { type: 'delta', text: 'hello' },
      { type: 'delta', text: ' stream' },
    ]);
    expect(creditStore.assertSufficientReserve).toHaveBeenCalledTimes(2);
    expect(creditStore.calculateCharge).toHaveBeenCalledTimes(1);
    expect(usageStore.recordEvent).toHaveBeenCalledTimes(1);
    expect(usageStore.recordEvent).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        status: 'degraded',
        creditAmount: 4,
        upstreamRequestId: 'upstream-stream-b',
        internalProviderId: 'internal-b',
        internalProviderModelId: 'channel-b',
      }),
    );
    const final = events.at(-1) as { type: 'final'; response: { text: string; status: string } };
    expect(final.response).toMatchObject({
      status: 'degraded',
      text: 'hello stream',
    });
  });
});

const provider: AiProvider = {
  id: 'dicha',
  name: 'DicHA AI',
  shortName: 'DicHA',
  description: 'Official DicHA AI service',
  baseUrl: 'https://gateway.dicha.local',
  status: 'enabled',
  category: 'official',
  authType: 'none',
  requestFormat: 'openai_compatible',
  credentialMode: 'platform_managed',
  billingMode: 'platform_credits',
  modelSyncMode: 'platform_catalog',
  credentialState: 'platform_managed',
  priority: 1,
};

const model: AiModel = {
  id: 'dicha:assistant-pro',
  providerId: 'dicha',
  name: 'assistant-pro',
  displayName: 'DicHA Assistant Pro',
  contextWindow: 128_000,
  modelType: 'chat',
  extensionParameters: [],
  capabilities: ['chat'],
  enabled: true,
  recommended: true,
  availability: 'healthy',
  lastLatencyMs: null,
  priceHint: 'Official credits',
  catalogSource: 'dicha_catalog',
  pricing: {
    currency: 'CNY',
    inputPerMillionTokens: 10,
    outputPerMillionTokens: 20,
  },
};

const catalog: AiGatewayCatalog = {
  generatedAt: '2026-07-04T00:00:00.000Z',
  providers: [provider],
  models: [model],
  assignments: [
    {
      useCase: 'assistant',
      primaryModelId: model.id,
      fallbackModelIds: [],
    },
  ],
};

const channels: SystemProviderChannel[] = [
  {
    id: 'channel-a',
    internalProviderId: 'internal-a',
    providerId: 'dicha',
    modelId: model.id,
    name: 'Upstream A',
    upstreamBaseUrl: 'https://upstream-a.example.com/v1',
    upstreamModelName: 'upstream-a',
    requestFormat: 'openai_compatible',
    authType: 'api_key',
    secret: 'secret-a',
  },
  {
    id: 'channel-b',
    internalProviderId: 'internal-b',
    providerId: 'dicha',
    modelId: model.id,
    name: 'Upstream B',
    upstreamBaseUrl: 'https://upstream-b.example.com/v1',
    upstreamModelName: 'upstream-b',
    requestFormat: 'openai_compatible',
    authType: 'api_key',
    secret: 'secret-b',
    parameterConfig: { top_p: 0.8 },
  },
];

const request: AiInvokeRequest = {
  useCase: 'assistant',
  messages: [{ role: 'user', content: 'Hello' }],
};
