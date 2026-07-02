import { describe, expect, test } from 'vitest';
import { lobeProviderKey } from './ai-catalog-ui';

describe('AI catalog UI helpers', () => {
  test('maps Dicha provider ids to LobeHub provider icon keys', () => {
    expect(lobeProviderKey({ id: 'fireworks', custom: false })).toBe('fireworksai');
    expect(lobeProviderKey({ id: 'cloudflare_workers_ai', custom: false })).toBe('cloudflare');
  });
});
