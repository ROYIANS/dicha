import { describe, expect, test } from 'vitest';
import type { AiModel, AiProvider } from '@dicha/shared';
import {
  compareProvidersByEnabled,
  fallbackModelIds,
  firstAssignableModelId,
  getAssignableModelGroups,
  getAssignableModelMap,
  lobeProviderKey,
} from './ai-catalog-ui';

describe('AI catalog UI helpers', () => {
  test('maps Dicha provider ids to LobeHub provider icon keys', () => {
    expect(lobeProviderKey({ id: 'fireworks', custom: false })).toBe('fireworksai');
    expect(lobeProviderKey({ id: 'cloudflare_workers_ai', custom: false })).toBe('cloudflare');
  });

  test('keeps the official Dicha provider first regardless of enabled state', () => {
    const sortedProviders = [
      provider({ id: 'openai', name: 'OpenAI', priority: 1 }),
      provider({ id: 'anthropic', name: 'Anthropic', priority: 2, status: 'disabled' }),
      provider({ id: 'dicha', name: 'Dicha AI', priority: 100, status: 'disabled' }),
      provider({ id: 'deepseek', name: 'DeepSeek', priority: 3 }),
    ].sort(compareProvidersByEnabled);

    expect(sortedProviders.map((item) => item.id)).toEqual([
      'dicha',
      'openai',
      'deepseek',
      'anthropic',
    ]);
  });

  test('groups assignment model options by enabled providers and enabled models', () => {
    const groups = getAssignableModelGroups({
      providers: [
        provider({ id: 'disabled-provider', name: 'Disabled Provider', priority: 1, status: 'disabled' }),
        provider({ id: 'needs-config', name: 'Needs Config', priority: 2, status: 'needs_config' }),
        provider({ id: 'openai', name: 'OpenAI', priority: 3 }),
        provider({ id: 'anthropic', name: 'Anthropic', priority: 4 }),
      ],
      models: [
        model({ id: 'disabled-provider:gpt-4o', providerId: 'disabled-provider', name: 'gpt-4o' }),
        model({ id: 'needs-config:claude', providerId: 'needs-config', name: 'claude' }),
        model({ id: 'openai:gpt-4o-disabled', providerId: 'openai', name: 'gpt-4o-disabled', enabled: false }),
        model({ id: 'openai:gpt-4o', providerId: 'openai', name: 'gpt-4o' }),
        model({ id: 'anthropic:claude', providerId: 'anthropic', name: 'claude' }),
      ],
    });

    expect(groups.map((group) => group.provider.id)).toEqual(['openai', 'anthropic']);
    expect(groups.map((group) => group.models.map((item) => item.id))).toEqual([
      ['openai:gpt-4o'],
      ['anthropic:claude'],
    ]);
  });

  test('finds the first assignable saved fallback without treating unavailable ids as selected', () => {
    const catalog = {
      providers: [
        provider({ id: 'openai', name: 'OpenAI', priority: 1 }),
        provider({ id: 'disabled-provider', name: 'Disabled Provider', priority: 2, status: 'disabled' }),
      ],
      models: [
        model({ id: 'disabled-provider:gpt-4o', providerId: 'disabled-provider', name: 'gpt-4o' }),
        model({ id: 'openai:gpt-4o-disabled', providerId: 'openai', name: 'gpt-4o-disabled', enabled: false }),
        model({ id: 'openai:gpt-4o', providerId: 'openai', name: 'gpt-4o' }),
        model({ id: 'openai:gpt-4.1', providerId: 'openai', name: 'gpt-4.1' }),
      ],
    };
    const assignableModels = getAssignableModelMap(catalog);

    expect(
      firstAssignableModelId(
        ['disabled-provider:gpt-4o', 'openai:gpt-4o-disabled', 'openai:gpt-4o'],
        assignableModels,
      ),
    ).toBe('openai:gpt-4o');
    expect(
      firstAssignableModelId(['openai:gpt-4o', 'openai:gpt-4.1'], assignableModels, 'openai:gpt-4o'),
    ).toBe('openai:gpt-4.1');
  });

  test('preserves fallback ids when changing primary unless they conflict with the new primary', () => {
    expect(
      fallbackModelIds({
        current: ['openai:gpt-4.1', 'anthropic:claude'],
        nextFirst: 'openai:gpt-4.1',
        primaryModelId: 'openai:gpt-4o',
      }),
    ).toEqual(['openai:gpt-4.1', 'anthropic:claude']);

    expect(
      fallbackModelIds({
        current: ['openai:gpt-4.1', 'anthropic:claude'],
        nextFirst: 'openai:gpt-4.1',
        primaryModelId: 'openai:gpt-4.1',
      }),
    ).toEqual(['anthropic:claude']);
  });
});

function provider({
  id,
  name,
  priority,
  status = 'enabled',
}: {
  id: string;
  name: string;
  priority: number;
  status?: AiProvider['status'];
}) {
  return {
    id,
    name,
    shortName: name.slice(0, 4),
    description: `${name} provider`,
    baseUrl: 'https://example.com/v1',
    status,
    category: 'global',
    authType: 'api_key',
    requestFormat: 'openai_compatible',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'configured',
    priority,
  } satisfies AiProvider;
}

function model({
  id,
  providerId,
  name,
  enabled = true,
}: {
  id: string;
  providerId: string;
  name: string;
  enabled?: boolean;
}) {
  return {
    id,
    providerId,
    name,
    displayName: name,
    contextWindow: 128000,
    modelType: 'chat',
    extensionParameters: [],
    capabilities: ['chat'],
    enabled,
    recommended: false,
    availability: 'healthy',
    lastLatencyMs: null,
    priceHint: '$0',
  } satisfies AiModel;
}
