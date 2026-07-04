import { describe, expect, test } from 'vitest';
import { aiCatalogFixture, aiModelBank, aiProviderTemplateIds, aiProviderTemplates } from '@dicha/shared';

const curatedProviderIds = [
  'dicha',
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'qwen',
  'zhipu',
  'moonshot',
  'volcengine',
  'tencent_hunyuan',
  'baidu_wenxin',
  'minimax',
  'siliconflow',
  'openrouter',
  'groq',
  'mistral',
  'xai',
  'perplexity',
  'together',
  'fireworks',
  'ollama',
  'lm_studio',
  'vllm',
  'xinference',
  'newapi',
  'fal',
  'replicate',
  'cloudflare_workers_ai',
];

describe('AI provider templates', () => {
  test('exposes a LobeHub-style provider bank and model bank as the default catalog', () => {
    const providerIds = aiProviderTemplates.map((provider) => provider.id);
    const modelProviderIds = new Set(aiModelBank.map((model) => model.providerId));

    expect(providerIds.slice(0, curatedProviderIds.length)).toEqual(curatedProviderIds);
    expect(aiProviderTemplateIds).toEqual(providerIds);
    expect(aiCatalogFixture.providers).toBe(aiProviderTemplates);
    expect(aiCatalogFixture.models).toBe(aiModelBank);
    expect(aiProviderTemplates).toHaveLength(81);
    expect(aiCatalogFixture.models).toHaveLength(1914);
    expect(modelProviderIds.size).toBe(79);
    expect(modelProviderIds.has('dicha')).toBe(false);
    expect([...modelProviderIds].filter((providerId) => !providerIds.includes(providerId))).toEqual([]);
    expect(providerIds).toEqual(expect.arrayContaining(['ai302', 'githubcopilot', 'bailiancodingplan']));
    expect(aiCatalogFixture.assignments.map((assignment) => assignment.useCase)).toEqual([
      'assistant',
      'item_profile',
      'image_understanding',
      'tagging',
      'summarization',
    ]);
    expect(
      aiCatalogFixture.assignments.flatMap((assignment) => [
        assignment.primaryModelId,
        ...assignment.fallbackModelIds,
      ]),
    ).not.toContain('dicha:assistant');
  });

  test('keeps official Dicha AI separate from user-owned provider billing', () => {
    const officialProvider = aiProviderTemplates.find((provider) => provider.id === 'dicha');
    expect(officialProvider).toMatchObject({
      avatar: '/assets/logo.svg',
      credentialMode: 'platform_managed',
      billingMode: 'platform_credits',
      modelSyncMode: 'platform_catalog',
      credentialState: 'platform_managed',
      authType: 'none',
    });
    expect(aiModelBank.some((model) => model.providerId === 'dicha')).toBe(false);

    const userProviders = aiProviderTemplates.filter((provider) => provider.id !== 'dicha');
    expect(userProviders.every((provider) => provider.billingMode === 'user_provider')).toBe(true);
    expect(userProviders.every((provider) => provider.status === 'disabled')).toBe(true);
    expect(
      userProviders
        .filter((provider) => provider.credentialMode === 'user_api_key')
        .every((provider) => provider.credentialState === 'missing'),
    ).toBe(true);
  });

  test('marks LobeHub router providers with model fetchers as syncable OpenAI-compatible endpoints', () => {
    const aiHubMix = aiProviderTemplates.find((provider) => provider.id === 'aihubmix');
    const zenMux = aiProviderTemplates.find((provider) => provider.id === 'zenmux');

    expect(aiHubMix).toMatchObject({
      baseUrl: 'https://aihubmix.com/v1',
      modelSyncMode: 'openai_models_endpoint',
      requestFormat: 'openai_compatible',
    });
    expect(zenMux).toMatchObject({
      baseUrl: 'https://zenmux.ai/v1',
      modelSyncMode: 'openai_models_endpoint',
      requestFormat: 'openai_compatible',
    });
  });

  test('keeps provider priority stable and unique', () => {
    const priorities = aiProviderTemplates.map((provider) => provider.priority);
    expect(priorities).toEqual([...priorities].sort((left, right) => left - right));
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  test('maps built-in provider models from LobeHub model-bank metadata', () => {
    expect(aiModelBank.filter((model) => model.providerId === 'openai')).toHaveLength(70);
    expect(aiModelBank.filter((model) => model.providerId === 'qwen')).toHaveLength(181);
    expect(aiModelBank.filter((model) => model.providerId === 'siliconflow')).toHaveLength(64);

    const deepSeekModels = aiModelBank
      .filter((model) => model.providerId === 'deepseek')
      .map((model) => ({
        contextWindow: model.contextWindow,
        extensionParameters: model.extensionParameters,
        maxOutput: model.maxOutput,
        name: model.name,
      }));

    expect(deepSeekModels).toEqual([
      {
        contextWindow: 1048576,
        extensionParameters: ['deepseekV4ReasoningEffort'],
        maxOutput: 393216,
        name: 'deepseek-v4-flash',
      },
      {
        contextWindow: 1048576,
        extensionParameters: ['deepseekV4ReasoningEffort'],
        maxOutput: 393216,
        name: 'deepseek-v4-pro',
      },
    ]);
  });
});
