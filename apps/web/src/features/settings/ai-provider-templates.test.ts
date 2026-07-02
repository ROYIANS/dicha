import { describe, expect, test } from 'vitest';
import { aiCatalogFixture, aiModelBank, aiProviderTemplateIds, aiProviderTemplates } from '@dicha/shared';

const expectedProviderIds = [
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
    expect(aiProviderTemplates.map((provider) => provider.id)).toEqual(expectedProviderIds);
    expect(aiProviderTemplateIds).toEqual(expectedProviderIds);
    expect(aiCatalogFixture.providers).toBe(aiProviderTemplates);
    expect(aiCatalogFixture.models).toBe(aiModelBank);
    expect(aiCatalogFixture.models.length).toBeGreaterThan(20);
    expect(aiCatalogFixture.assignments.map((assignment) => assignment.useCase)).toEqual([
      'assistant',
      'item_profile',
      'image_understanding',
      'tagging',
      'summarization',
    ]);
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

    const userProviders = aiProviderTemplates.filter((provider) => provider.id !== 'dicha');
    expect(userProviders.every((provider) => provider.billingMode === 'user_provider')).toBe(true);
    expect(userProviders.every((provider) => provider.status === 'disabled')).toBe(true);
    expect(
      userProviders
        .filter((provider) => provider.credentialMode === 'user_api_key')
        .every((provider) => provider.credentialState === 'missing'),
    ).toBe(true);
  });

  test('keeps provider priority stable and unique', () => {
    const priorities = aiProviderTemplates.map((provider) => provider.priority);
    expect(priorities).toEqual([...priorities].sort((left, right) => left - right));
    expect(new Set(priorities).size).toBe(priorities.length);
  });
});
