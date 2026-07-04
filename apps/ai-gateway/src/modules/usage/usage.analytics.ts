import type {
  AiUsageBreakdown,
  AiUsageBucketGranularity,
  AiUsageDistribution,
  AiUsageDistributionGroupBy,
  AiUsageEvent,
  AiUsagePerformance,
  AiUsageReport,
  AiUsageSummary,
  AiUsageTimeBucket,
  AiUsageTimeSeries,
  AiUsageWindow,
} from '@dicha/shared';

type UsageAnalyticsReport = Pick<
  AiUsageReport,
  | 'from'
  | 'to'
  | 'summary'
  | 'performance'
  | 'timeSeries'
  | 'distributions'
  | 'byProvider'
  | 'byModel'
  | 'byUseCase'
  | 'recentEvents'
>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;
const MAX_HOURLY_BUCKETS = 24 * 7;

export const emptyUsageSummary = (): AiUsageSummary => ({
  calls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  degradedCalls: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  creditAmount: 0,
  estimatedCostUsd: 0,
  costByCurrency: [],
  averageLatencyMs: null,
});

export const emptyUsagePerformance = (): AiUsagePerformance => ({
  averageRpm: 0,
  averageTpm: 0,
  peakRpm: 0,
  peakTpm: 0,
  successRate: 0,
  p95LatencyMs: null,
});

export function buildUsageAnalyticsReport(
  invokeEvents: AiUsageEvent[],
  window: AiUsageWindow,
  now = new Date(),
): UsageAnalyticsReport {
  const from = windowStart(now, window);
  const allInvokeEvents = [...invokeEvents].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const events = allInvokeEvents
    .filter((event) => (from ? new Date(event.createdAt) >= from : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const rangeFrom = reportRangeStart(events, from, now);
  const hourlyFrom = hourlyRangeStart(events, rangeFrom, now);
  const recent24hFrom = new Date(now.getTime() - 24 * HOUR_MS);

  return {
    from: from?.toISOString() ?? null,
    to: now.toISOString(),
    summary: summarizeUsage(events),
    performance: usagePerformance(events, rangeFrom, now),
    timeSeries: usageTimeSeries(allInvokeEvents, events, recent24hFrom, hourlyFrom, rangeFrom, now),
    distributions: {
      providerHourly: usageDistribution(events, hourlyFrom, now, 'hour', 'provider'),
      providerDaily: usageDistribution(events, rangeFrom, now, 'day', 'provider'),
      modelHourly: usageDistribution(events, hourlyFrom, now, 'hour', 'model'),
      modelDaily: usageDistribution(events, rangeFrom, now, 'day', 'model'),
    },
    byProvider: usageBreakdown(events, (event) => ({
      key: event.providerId,
      label: event.providerName,
    })),
    byModel: usageBreakdown(events, (event) => ({
      key: event.modelId,
      label: event.modelName,
    })),
    byUseCase: usageBreakdown(events, (event) => ({
      key: event.useCase,
      label: event.useCase,
    })),
    recentEvents: events.slice(0, 12),
  };
}

export function summarizeUsage(events: AiUsageEvent[]): AiUsageSummary {
  const summary = emptyUsageSummary();
  let latencyTotal = 0;
  let latencyCount = 0;

  for (const event of events) {
    summary.calls += 1;
    summary.successfulCalls += event.status === 'success' ? 1 : 0;
    summary.failedCalls += event.status === 'failure' ? 1 : 0;
    summary.degradedCalls += event.status === 'degraded' ? 1 : 0;
    summary.promptTokens += event.promptTokens;
    summary.completionTokens += event.completionTokens;
    summary.totalTokens += event.totalTokens;
    summary.creditAmount += event.creditAmount;
    summary.estimatedCostUsd += event.estimatedCostUsd;
    addCost(summary, event.estimatedCostCurrency, event.estimatedCostAmount);
    if (event.latencyMs !== null) {
      latencyTotal += event.latencyMs;
      latencyCount += 1;
    }
  }

  summary.estimatedCostUsd = Number(summary.estimatedCostUsd.toFixed(6));
  summary.costByCurrency = summary.costByCurrency.map((item) => ({
    currency: item.currency,
    amount: Number(item.amount.toFixed(6)),
  }));
  summary.averageLatencyMs = latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : null;
  return summary;
}

function addCost(
  summary: AiUsageSummary,
  currency: AiUsageEvent['estimatedCostCurrency'],
  amount: number,
): void {
  if (!currency || amount <= 0) return;
  const current = summary.costByCurrency.find((item) => item.currency === currency);
  if (current) {
    current.amount += amount;
  } else {
    summary.costByCurrency.push({ currency, amount });
  }
}

function usageTimeSeries(
  allInvokeEvents: AiUsageEvent[],
  selectedEvents: AiUsageEvent[],
  recent24hFrom: Date,
  hourlyFrom: Date,
  rangeFrom: Date | null,
  now: Date,
): AiUsageTimeSeries {
  const recent24hEvents = allInvokeEvents.filter((event) => new Date(event.createdAt) >= recent24hFrom);
  return {
    recent24h: timeBuckets(recent24hEvents, recent24hFrom, now, 'hour'),
    hourly: timeBuckets(selectedEvents, hourlyFrom, now, 'hour'),
    daily: rangeFrom ? timeBuckets(selectedEvents, rangeFrom, now, 'day') : [],
  };
}

function usagePerformance(events: AiUsageEvent[], from: Date | null, to: Date): AiUsagePerformance {
  if (events.length === 0) return emptyUsagePerformance();

  const summary = summarizeUsage(events);
  const firstEventAt = firstEventDate(events) ?? to;
  const rangeStart = from ?? firstEventAt;
  const minutes = Math.max(1, (to.getTime() - rangeStart.getTime()) / MINUTE_MS);
  const minuteBuckets = new Map<string, { calls: number; tokens: number }>();
  const latencies = events
    .map((event) => event.latencyMs)
    .filter((latency): latency is number => latency !== null)
    .sort((left, right) => left - right);

  for (const event of events) {
    const bucketKey = minuteKey(new Date(event.createdAt));
    const bucket = minuteBuckets.get(bucketKey) ?? { calls: 0, tokens: 0 };
    bucket.calls += 1;
    bucket.tokens += event.totalTokens;
    minuteBuckets.set(bucketKey, bucket);
  }

  return {
    averageRpm: roundRate(summary.calls / minutes),
    averageTpm: roundRate(summary.totalTokens / minutes),
    peakRpm: Math.max(...Array.from(minuteBuckets.values()).map((bucket) => bucket.calls), 0),
    peakTpm: Math.max(...Array.from(minuteBuckets.values()).map((bucket) => bucket.tokens), 0),
    successRate: summary.calls > 0 ? roundRate(summary.successfulCalls / summary.calls) : 0,
    p95LatencyMs: latencies.length > 0 ? (latencies[Math.ceil(latencies.length * 0.95) - 1] ?? null) : null,
  };
}

function usageBreakdown(
  events: AiUsageEvent[],
  identity: (event: AiUsageEvent) => Pick<AiUsageBreakdown, 'key' | 'label'>,
): AiUsageBreakdown[] {
  const grouped = new Map<string, { label: string; events: AiUsageEvent[] }>();
  for (const event of events) {
    const item = identity(event);
    const group = grouped.get(item.key);
    if (group) {
      group.events.push(event);
    } else {
      grouped.set(item.key, { label: item.label, events: [event] });
    }
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      ...summarizeUsage(value.events),
    }))
    .sort((left, right) => {
      if (right.creditAmount !== left.creditAmount) return right.creditAmount - left.creditAmount;
      if (right.estimatedCostUsd !== left.estimatedCostUsd) return right.estimatedCostUsd - left.estimatedCostUsd;
      return right.totalTokens - left.totalTokens;
    });
}

function usageDistribution(
  events: AiUsageEvent[],
  from: Date | null,
  to: Date,
  granularity: AiUsageBucketGranularity,
  groupBy: AiUsageDistributionGroupBy,
): AiUsageDistribution {
  const buckets = from ? timeBuckets(events, from, to, granularity) : [];
  const grouped = new Map<string, { label: string; events: AiUsageEvent[] }>();

  for (const event of events) {
    const key = groupBy === 'provider' ? event.providerId : `${event.providerId}:${event.modelId}`;
    const label = groupBy === 'provider' ? event.providerName : `${event.modelName} · ${event.providerName}`;
    const group = grouped.get(key);
    if (group) {
      group.events.push(event);
    } else {
      grouped.set(key, { label, events: [event] });
    }
  }

  const groups = Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      groupBy,
      ...summarizeUsage(value.events),
      buckets: from ? timeBuckets(value.events, from, to, granularity) : [],
    }))
    .sort((left, right) => {
      if (right.creditAmount !== left.creditAmount) return right.creditAmount - left.creditAmount;
      if (right.estimatedCostUsd !== left.estimatedCostUsd) return right.estimatedCostUsd - left.estimatedCostUsd;
      if (right.totalTokens !== left.totalTokens) return right.totalTokens - left.totalTokens;
      return right.calls - left.calls;
    });

  return {
    groupBy,
    granularity,
    buckets,
    groups,
  };
}

function timeBuckets(
  events: AiUsageEvent[],
  from: Date,
  to: Date,
  granularity: AiUsageBucketGranularity,
): AiUsageTimeBucket[] {
  const buckets: AiUsageTimeBucket[] = [];
  const bucketStart = granularity === 'hour' ? startOfHour(from) : startOfDay(from);
  const bucketMs = granularity === 'hour' ? HOUR_MS : DAY_MS;

  for (let cursor = bucketStart; cursor < to; cursor = new Date(cursor.getTime() + bucketMs)) {
    const end = new Date(cursor.getTime() + bucketMs);
    const bucketEvents = events.filter((event) => {
      const createdAt = new Date(event.createdAt);
      return createdAt >= cursor && createdAt < end;
    });
    buckets.push({
      key: `${granularity}:${cursor.toISOString()}`,
      label: bucketLabel(cursor, granularity),
      granularity,
      start: cursor.toISOString(),
      end: end.toISOString(),
      ...summarizeUsage(bucketEvents),
    });
  }

  return buckets;
}

function windowStart(now: Date, window: AiUsageWindow): Date | null {
  const hoursByWindow: Record<Exclude<AiUsageWindow, 'all'>, number> = {
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
  };
  if (window === 'all') return null;
  return new Date(now.getTime() - hoursByWindow[window] * HOUR_MS);
}

function reportRangeStart(events: AiUsageEvent[], from: Date | null, now: Date): Date | null {
  if (from) return from;
  return firstEventDate(events) ?? (events.length > 0 ? now : null);
}

function hourlyRangeStart(events: AiUsageEvent[], rangeFrom: Date | null, now: Date): Date {
  const cappedFrom = new Date(now.getTime() - MAX_HOURLY_BUCKETS * HOUR_MS);
  const candidate = rangeFrom ?? firstEventDate(events) ?? new Date(now.getTime() - 24 * HOUR_MS);
  return candidate > cappedFrom ? candidate : cappedFrom;
}

function firstEventDate(events: AiUsageEvent[]): Date | null {
  if (events.length === 0) return null;
  return events.reduce((earliest, event) => {
    const createdAt = new Date(event.createdAt);
    return createdAt < earliest ? createdAt : earliest;
  }, new Date(events[0]!.createdAt));
}

function startOfHour(date: Date): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function minuteKey(date: Date): string {
  const next = new Date(date);
  next.setUTCSeconds(0, 0);
  return next.toISOString();
}

function bucketLabel(date: Date, granularity: AiUsageBucketGranularity): string {
  if (granularity === 'hour') return date.toISOString().slice(11, 16);
  return date.toISOString().slice(5, 10);
}

function roundRate(value: number): number {
  return Number(value.toFixed(3));
}
