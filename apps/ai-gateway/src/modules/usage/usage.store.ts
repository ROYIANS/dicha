import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiUsageBreakdown,
  AiUsageEvent,
  AiUsageReport,
  AiUsageSummary,
  AiUsageWindow,
} from '@dicha/shared';

type PersistedUsage = {
  events: AiUsageEvent[];
};

type UsageRecord = Omit<AiUsageEvent, 'id' | 'createdAt' | 'totalTokens'> & {
  id?: string;
  createdAt?: string;
  totalTokens?: number;
};

const emptySummary = (): AiUsageSummary => ({
  calls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  degradedCalls: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  averageLatencyMs: null,
});

@Injectable()
export class UsageStore {
  private readonly dataDir: string;

  constructor(config: ConfigService) {
    this.dataDir = config.get<string>('AI_GATEWAY_DATA_DIR', './data/ai-gateway');
  }

  async recordEvent(ownerId: string, record: UsageRecord): Promise<AiUsageEvent> {
    const current = await this.readUsage(ownerId);
    const event: AiUsageEvent = {
      ...record,
      id: record.id ?? randomUUID(),
      createdAt: record.createdAt ?? new Date().toISOString(),
      totalTokens: record.totalTokens ?? record.promptTokens + record.completionTokens,
    };
    await this.writeUsage(ownerId, { events: [...current.events, event] });
    return event;
  }

  async getReport(ownerId: string, window: AiUsageWindow): Promise<AiUsageReport> {
    const now = new Date();
    const from = this.windowStart(now, window);
    const persisted = await this.readUsage(ownerId);
    const events = persisted.events
      .filter((event) => event.kind === 'invoke')
      .filter((event) => (from ? new Date(event.createdAt) >= from : true))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return {
      generatedAt: now.toISOString(),
      window,
      from: from?.toISOString() ?? null,
      to: now.toISOString(),
      summary: this.summarize(events),
      byProvider: this.breakdown(events, (event) => ({
        key: event.providerId,
        label: event.providerName,
      })),
      byModel: this.breakdown(events, (event) => ({
        key: event.modelId,
        label: event.modelName,
      })),
      byUseCase: this.breakdown(events, (event) => ({
        key: event.useCase,
        label: event.useCase,
      })),
      recentEvents: events.slice(0, 12),
    };
  }

  private summarize(events: AiUsageEvent[]): AiUsageSummary {
    const summary = emptySummary();
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
      summary.estimatedCostUsd += event.estimatedCostUsd;
      if (event.latencyMs !== null) {
        latencyTotal += event.latencyMs;
        latencyCount += 1;
      }
    }

    summary.estimatedCostUsd = Number(summary.estimatedCostUsd.toFixed(6));
    summary.averageLatencyMs =
      latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : null;
    return summary;
  }

  private breakdown(
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
        ...this.summarize(value.events),
      }))
      .sort((left, right) => right.estimatedCostUsd - left.estimatedCostUsd);
  }

  private windowStart(now: Date, window: AiUsageWindow): Date | null {
    const hoursByWindow: Record<Exclude<AiUsageWindow, 'all'>, number> = {
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    };
    if (window === 'all') return null;
    return new Date(now.getTime() - hoursByWindow[window] * 60 * 60 * 1000);
  }

  private async readUsage(ownerId: string): Promise<PersistedUsage> {
    try {
      const raw = await readFile(this.usagePath(ownerId), 'utf8');
      return JSON.parse(raw) as PersistedUsage;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return { events: [] };
    }
  }

  private async writeUsage(ownerId: string, usage: PersistedUsage): Promise<void> {
    const usagePath = this.usagePath(ownerId);
    await mkdir(dirname(usagePath), { recursive: true, mode: 0o700 });
    await chmod(dirname(usagePath), 0o700);
    const nextPath = `${usagePath}.tmp`;
    await writeFile(nextPath, `${JSON.stringify(usage, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(nextPath, usagePath);
    await chmod(usagePath, 0o600);
  }

  private usagePath(ownerId: string): string {
    const ownerKey = createHash('sha256').update(ownerId).digest('hex').slice(0, 32);
    return join(this.dataDir, 'users', `${ownerKey}.usage.json`);
  }
}
