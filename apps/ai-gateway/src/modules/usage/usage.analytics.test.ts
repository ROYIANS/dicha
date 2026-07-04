/// <reference types="vitest/globals" />

import type { AiUsageEvent } from '@dicha/shared';
import { buildUsageAnalyticsReport } from './usage.analytics';

describe('buildUsageAnalyticsReport', () => {
  test('returns stable empty analytics', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const report = buildUsageAnalyticsReport([], 'all', now);

    expect(report.summary.calls).toBe(0);
    expect(report.performance.averageRpm).toBe(0);
    expect(report.performance.averageTpm).toBe(0);
    expect(report.timeSeries.recent24h.length).toBe(24);
    expect(report.timeSeries.daily).toEqual([]);
    expect(report.distributions.modelDaily.groups).toEqual([]);
  });

  test('aggregates performance, buckets, and model/provider distributions', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const events: AiUsageEvent[] = [
      usageEvent({
        id: 'evt-1',
        status: 'success',
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-4.1-mini',
        modelName: 'GPT-4.1 mini',
        promptTokens: 100,
        completionTokens: 50,
        estimatedCostUsd: 0.001,
        latencyMs: 700,
        createdAt: '2026-07-04T11:30:05.000Z',
      }),
      usageEvent({
        id: 'evt-2',
        status: 'degraded',
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-4.1-mini',
        modelName: 'GPT-4.1 mini',
        promptTokens: 80,
        completionTokens: 40,
        estimatedCostUsd: 0.0012,
        latencyMs: 1100,
        createdAt: '2026-07-04T11:30:40.000Z',
      }),
      usageEvent({
        id: 'evt-3',
        status: 'failure',
        useCase: 'assistant',
        providerId: 'anthropic',
        providerName: 'Anthropic',
        modelId: 'claude-sonnet-4-5',
        modelName: 'Claude Sonnet 4.5',
        promptTokens: 60,
        completionTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: null,
        errorCategory: 'provider_unavailable',
        createdAt: '2026-07-04T10:30:00.000Z',
      }),
    ];

    const report = buildUsageAnalyticsReport(events, '24h', now);

    expect(report.summary).toMatchObject({
      calls: 3,
      successfulCalls: 1,
      degradedCalls: 1,
      failedCalls: 1,
      promptTokens: 240,
      completionTokens: 90,
      totalTokens: 330,
      estimatedCostUsd: 0.0022,
      averageLatencyMs: 900,
    });
    expect(report.performance.averageRpm).toBeCloseTo(0.002, 3);
    expect(report.performance.averageTpm).toBeCloseTo(0.229, 3);
    expect(report.performance.peakRpm).toBe(2);
    expect(report.performance.peakTpm).toBe(270);
    expect(report.performance.successRate).toBeCloseTo(1 / 3, 3);
    expect(report.performance.p95LatencyMs).toBe(1100);
    expect(report.timeSeries.recent24h).toHaveLength(24);
    expect(report.timeSeries.recent24h.some((bucket) => bucket.calls > 0)).toBe(true);
    expect(report.distributions.providerHourly.groups.map((group) => group.key)).toEqual(['openai', 'anthropic']);
    expect(report.distributions.modelHourly.groups[0]).toMatchObject({
      key: 'openai:gpt-4.1-mini',
      label: 'GPT-4.1 mini · OpenAI',
      calls: 2,
      totalTokens: 270,
    });
    expect(report.byProvider[0]).toMatchObject({
      key: 'openai',
      calls: 2,
      estimatedCostUsd: 0.0022,
    });
  });
});

function usageEvent(overrides: Partial<AiUsageEvent>): AiUsageEvent {
  const promptTokens = overrides.promptTokens ?? 0;
  const completionTokens = overrides.completionTokens ?? 0;
  return {
    id: overrides.id ?? 'evt',
    kind: 'invoke',
    status: overrides.status ?? 'success',
    useCase: overrides.useCase ?? 'item_profile',
    providerId: overrides.providerId ?? 'openai',
    providerName: overrides.providerName ?? 'OpenAI',
    modelId: overrides.modelId ?? 'gpt-4.1-mini',
    modelName: overrides.modelName ?? 'GPT-4.1 mini',
    promptTokens,
    completionTokens,
    totalTokens: overrides.totalTokens ?? promptTokens + completionTokens,
    estimatedCostUsd: overrides.estimatedCostUsd ?? 0,
    latencyMs: overrides.latencyMs ?? null,
    errorCategory: overrides.errorCategory ?? null,
    createdAt: overrides.createdAt ?? '2026-07-04T12:00:00.000Z',
  };
}
