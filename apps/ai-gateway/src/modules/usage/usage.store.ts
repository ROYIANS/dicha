import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AiUsageEvent, AiUsageReport, AiUsageWindow } from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildUsageAnalyticsReport } from './usage.analytics';

type UsageRecord = Omit<
  AiUsageEvent,
  | 'id'
  | 'createdAt'
  | 'totalTokens'
  | 'creditAmount'
  | 'billingMode'
  | 'requestId'
  | 'upstreamRequestId'
  | 'internalProviderId'
  | 'internalProviderModelId'
  | 'creditLedgerEntryId'
  | 'usageEstimated'
> & {
  id?: string;
  createdAt?: string;
  totalTokens?: number;
  creditAmount?: number;
  billingMode?: AiUsageEvent['billingMode'];
  requestId?: string | null;
  upstreamRequestId?: string | null;
  internalProviderId?: string | null;
  internalProviderModelId?: string | null;
  creditLedgerEntryId?: string | null;
  usageEstimated?: boolean;
  billingSnapshot?: Record<string, unknown> | null;
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
      creditAmount: record.creditAmount ?? 0,
      billingMode: record.billingMode ?? 'user_provider',
      requestId: record.requestId ?? null,
      upstreamRequestId: record.upstreamRequestId ?? null,
      internalProviderId: record.internalProviderId ?? null,
      internalProviderModelId: record.internalProviderModelId ?? null,
      creditLedgerEntryId: record.creditLedgerEntryId ?? null,
      usageEstimated: record.usageEstimated ?? false,
    };
    return this.prisma.$transaction(async (tx) => {
      let creditLedgerEntryId: string | null = event.creditLedgerEntryId;
      if (event.creditAmount > 0 && event.billingMode === 'platform_credits' && event.status !== 'failure') {
        const account = await tx.creditAccount.upsert({
          where: { ownerId },
          update: {},
          create: { ownerId },
        });
        const debit = await tx.creditAccount.updateMany({
          where: { id: account.id, balance: { gte: event.creditAmount } },
          data: {
            balance: { decrement: event.creditAmount },
            lifetimeSpent: { increment: event.creditAmount },
          },
        });
        if (debit.count !== 1) {
          throw new Error('Insufficient Dicha credits');
        }
        const updated = await tx.creditAccount.findUniqueOrThrow({ where: { id: account.id } });
        const ledger = await tx.creditLedgerEntry.create({
          data: {
            ownerId,
            accountId: updated.id,
            type: 'debit',
            amount: -event.creditAmount,
            balanceAfter: updated.balance,
            source: 'ai_invoke',
            sourceId: event.requestId,
            aiUsageEventId: event.id,
            description: `Dicha AI 调用：${event.modelName}`,
            metadata: record.billingSnapshot
              ? (record.billingSnapshot as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });
        creditLedgerEntryId = ledger.id;
      }

      const created = await tx.aiUsageEvent.create({
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
          estimatedCostAmount: event.estimatedCostAmount,
          estimatedCostCurrency: event.estimatedCostCurrency,
          creditAmount: event.creditAmount,
          billingMode: event.billingMode,
          requestId: event.requestId,
          upstreamRequestId: event.upstreamRequestId,
          internalProviderId: event.internalProviderId,
          internalProviderModelId: event.internalProviderModelId,
          creditLedgerEntryId,
          usageEstimated: event.usageEstimated,
          billingSnapshot: record.billingSnapshot
            ? (record.billingSnapshot as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          latencyMs: event.latencyMs,
          errorCategory: event.errorCategory,
          createdAt: new Date(event.createdAt),
        },
      });
      return this.eventFromRecord(created);
    });
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
      ...maskUserFacingCosts(analytics),
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
      creditAmount: event.creditAmount,
      billingMode: event.billingMode as AiUsageEvent['billingMode'],
      requestId: event.requestId,
      upstreamRequestId: event.upstreamRequestId,
      internalProviderId: event.internalProviderId,
      internalProviderModelId: event.internalProviderModelId,
      creditLedgerEntryId: event.creditLedgerEntryId,
      usageEstimated: event.usageEstimated,
      estimatedCostUsd: event.estimatedCostUsd,
      estimatedCostAmount: event.estimatedCostAmount,
      estimatedCostCurrency: event.estimatedCostCurrency as AiUsageEvent['estimatedCostCurrency'],
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

function maskUserFacingCosts(
  report: Omit<AiUsageReport, 'generatedAt' | 'window'>,
): Omit<AiUsageReport, 'generatedAt' | 'window'> {
  return {
    ...report,
    summary: maskSummary(report.summary),
    timeSeries: {
      recent24h: report.timeSeries.recent24h.map(maskSummary),
      hourly: report.timeSeries.hourly.map(maskSummary),
      daily: report.timeSeries.daily.map(maskSummary),
    },
    distributions: {
      providerHourly: maskDistribution(report.distributions.providerHourly),
      providerDaily: maskDistribution(report.distributions.providerDaily),
      modelHourly: maskDistribution(report.distributions.modelHourly),
      modelDaily: maskDistribution(report.distributions.modelDaily),
    },
    byProvider: report.byProvider.map(maskSummary),
    byModel: report.byModel.map(maskSummary),
    byUseCase: report.byUseCase.map(maskSummary),
    recentEvents: report.recentEvents.map((event) => ({
      ...event,
      estimatedCostUsd: 0,
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
    })),
  };
}

function maskDistribution<T extends AiUsageReport['distributions']['providerHourly']>(distribution: T): T {
  return {
    ...distribution,
    buckets: distribution.buckets.map(maskSummary),
    groups: distribution.groups.map((group) => ({
      ...maskSummary(group),
      buckets: group.buckets.map(maskSummary),
    })),
  };
}

function maskSummary<T extends { estimatedCostUsd: number; estimatedCostAmount?: number; estimatedCostCurrency?: unknown; costByCurrency: unknown[] }>(
  value: T,
): T {
  return {
    ...value,
    estimatedCostUsd: 0,
    ...(Object.hasOwn(value, 'estimatedCostAmount') ? { estimatedCostAmount: 0 } : {}),
    ...(Object.hasOwn(value, 'estimatedCostCurrency') ? { estimatedCostCurrency: null } : {}),
    costByCurrency: [],
  };
}
