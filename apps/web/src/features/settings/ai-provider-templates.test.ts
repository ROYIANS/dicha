import { describe, expect, test } from 'vitest';
import { aiCatalogFixture, aiProviderTemplateIds, aiProviderTemplates } from '@dicha/shared';

describe('AI provider templates', () => {
  test('keeps the initial catalog empty and exposes built-in providers as disabled templates', () => {
    expect(aiCatalogFixture.providers).toEqual([]);
    expect(aiCatalogFixture.models).toEqual([]);
    expect(aiCatalogFixture.assignments).toEqual([]);

    expect(aiProviderTemplates.map((provider) => provider.id)).toEqual([
      'openai',
      'deepseek',
      'anthropic',
    ]);
    expect(aiProviderTemplates.every((provider) => provider.status === 'disabled')).toBe(true);
    expect(aiProviderTemplates.every((provider) => provider.credentialState === 'missing')).toBe(true);
    expect(aiProviderTemplateIds).toEqual(['openai', 'deepseek', 'anthropic']);
  });
});
