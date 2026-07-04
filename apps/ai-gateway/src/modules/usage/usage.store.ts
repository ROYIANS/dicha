import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AiUsageEvent, AiUsageReport, AiUsageWindow } from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildUsageAnalyticsReport } from './usage.analytics';

type UsageRecord = Omit<AiUsageEvent, 'id' | 'createdAt' | 'totalTokens'> & {
  id?: string;
  createdAt?: string;
  totalTokens?: number;
};

@Injectable()
export class UsageStore {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(ownerId: string, record: UsageRecord): Promise<AiUsageEvent> {
    const event: AiUsageEvent = {
      ...record,
      id: record.id ?? randomUUID(),
      createdAt: record.createdAt ?? new Date().toISOString(),
      totalTokens: record.totalTokens ?? record.promptTokens + record.completionTokens,
    };
    await this.prisma.aiUsageEvent.create({
      data: {
        id: event.id,
        ownerId,
        kind: event.kind,
        status: event.status,
        useCase: event.useCase,
        providerId: event.providerId,
        providerName: event.providerName,
        modelId: event.modelId,
        modelName: event.modelName,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        estimatedCostUsd: event.estimatedCostUsd,
        latencyMs: event.latencyMs,
        errorCategory: event.errorCategory,
        createdAt: new Date(event.createdAt),
      },
    });
    return event;
  }

  async getReport(ownerId: string, window: AiUsageWindow): Promise<AiUsageReport> {
    const now = new Date();
    const from = this.windowStart(window, now);
    const events = await this.prisma.aiUsageEvent.findMany({
      where: {
        ownerId,
        kind: 'invoke',
        ...(from ? { createdAt: { gte: from } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const analytics = buildUsageAnalyticsReport(
      events.map((event) => this.eventFromRecord(event)),
      window,
      now,
    );

    return {
      generatedAt: now.toISOString(),
      window,
      ...analytics,
    };
  }

  private eventFromRecord(
    event: Prisma.AiUsageEventGetPayload<Record<string, never>>,
  ): AiUsageEvent {
    return {
      id: event.id,
      kind: event.kind as AiUsageEvent['kind'],
      status: event.status as AiUsageEvent['status'],
      useCase: event.useCase as AiUsageEvent['useCase'],
      providerId: event.providerId,
      providerName: event.providerName,
      modelId: event.modelId,
      modelName: event.modelName,
      promptTokens: event.promptTokens,
      completionTokens: event.completionTokens,
      totalTokens: event.totalTokens,
      estimatedCostUsd: event.estimatedCostUsd,
      latencyMs: event.latencyMs,
      errorCategory: event.errorCategory,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private windowStart(window: AiUsageWindow, now: Date): Date | null {
    if (window === 'all') return null;
    const hours = window === '24h' ? 24 : window === '7d' ? 24 * 7 : 24 * 30;
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }
}
