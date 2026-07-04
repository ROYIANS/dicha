import { randomUUID } from 'node:crypto';
import type {
  AiGatewayCatalog,
  AiInvokeAttempt,
  AiInvokeErrorCategory,
  AiInvokeRequest,
  AiInvokeResponse,
  AiInvokeStreamEvent,
  AiInvokeUsage,
  AiModel,
  AiProvider,
  AiProviderRequestFormat,
  AiSettlementCurrency,
  AiUsageStatus,
} from '@dicha/shared';
import type { CatalogStore, SystemProviderChannel } from '../catalog/catalog.store';
import type { CreditStore } from '../credits/credit.store';
import type { CreditCharge } from '../credits/credit.store';
import type { UsageStore } from '../usage/usage.store';
import type { InvokeAdapterRegistry } from './adapters/invoke-adapter.registry';
import { isAbortError } from './adapters/invoke-adapter';
import { InvokeError, sanitizedAiMessage } from './adapters/invoke-error';

type InvokeSuccess = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  upstreamRequestId: string | null;
};

type UsageSettlement = Pick<
  AiInvokeUsage,
  'estimatedCostAmount' | 'estimatedCostCurrency' | 'estimatedCostUsd' | 'creditAmount'
> & {
  billingSnapshot: Record<string, unknown> | null;
};

type InvokeFailure = {
  category: AiInvokeErrorCategory;
  message: string;
  retryable: boolean;
};

type AttemptTarget = {
  model: AiModel;
  provider: AiProvider;
  channel?: SystemProviderChannel;
};

type InvokeStreamSink = {
  emit(event: AiInvokeStreamEvent): void | Promise<void>;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 45_000;

export class InvokeService {
  constructor(
    private readonly catalogStore: CatalogStore,
    private readonly creditStore: CreditStore,
    private readonly usageStore: UsageStore,
    private readonly adapterRegistry: InvokeAdapterRegistry,
  ) {}

  async invoke(ownerId: string, request: AiInvokeRequest): Promise<AiInvokeResponse> {
    const requestId = randomUUID();
    const catalog = await this.catalogStore.getCatalog(ownerId);
    const targets = await this.attemptTargets(catalog, request);
    const attempts: AiInvokeAttempt[] = [];
    let finalFailureTarget: AttemptTarget | null = null;

    for (const target of targets) {
      const validationFailure = await this.validateTarget(ownerId, target);
      const requestFormat = this.resolvedRequestFormat(target, request);
      if (validationFailure) {
        attempts.push(this.failedAttempt(target, requestFormat, null, validationFailure));
        finalFailureTarget = target;
        if (!validationFailure.retryable) break;
        continue;
      }

      if (target.provider.credentialMode === 'platform_managed' && !target.channel) {
        const failure = this.invokeError(
          'config',
          'Platform-managed AI provider channel is not configured',
          true,
        );
        attempts.push(this.failedAttempt(target, requestFormat, null, failure));
        finalFailureTarget = target;
        continue;
      }
      const reserveFailure = await this.reserveCredits(ownerId, target, request);
      if (reserveFailure) {
        attempts.push(this.failedAttempt(target, requestFormat, null, reserveFailure));
        finalFailureTarget = target;
        break;
      }
      const startedAt = Date.now();
      try {
        const result = await this.invokeUpstream({
          target,
          request,
          requestFormat,
          secret: await this.providerSecret(ownerId, target),
        });
        const status: AiUsageStatus = attempts.some((attempt) => attempt.status === 'failure')
          ? 'degraded'
          : 'success';
        const usageBase = this.invokeUsageBase(request, result);
        const settlement = await this.settleUsage(target, usageBase, target.channel);
        const usage = this.userVisibleUsage(usageBase, settlement);
        attempts.push({
          providerId: target.provider.id,
          providerName: target.provider.name,
          modelId: target.model.id,
          modelName: target.model.displayName,
          requestFormat,
          status,
          latencyMs: result.latencyMs,
          errorCategory: null,
        });
        await this.recordUsage({
          ownerId,
          request,
          requestId,
          target,
          channel: target.channel,
          status,
          usage,
          settlement,
          latencyMs: result.latencyMs,
          errorCategory: null,
          upstreamRequestId: result.upstreamRequestId,
        });
        return this.response({
          attempts,
          error: null,
          generatedAt: new Date().toISOString(),
          request,
          requestFormat,
          status,
          target,
          text: result.text,
          usage,
        });
      } catch (error) {
        const failure = this.classifyError(error);
        attempts.push(this.failedAttempt(target, requestFormat, Date.now() - startedAt, failure));
        finalFailureTarget = target;
        if (!failure.retryable) break;
      }
    }

    const finalAttempt = [...attempts].reverse().find((attempt) => attempt.status === 'failure');
    const finalTarget = finalFailureTarget ?? (finalAttempt ? this.targetFromAttempt(catalog, finalAttempt) : null);
    const usage = this.emptyUsage();
    if (finalAttempt && finalTarget) {
      await this.recordUsage(
        {
          ownerId,
          request,
          requestId,
          target: finalTarget,
          channel: finalTarget.channel,
          status: 'failure',
          usage,
          settlement: this.emptySettlement(),
          latencyMs: finalAttempt.latencyMs,
          errorCategory: finalAttempt.errorCategory,
          upstreamRequestId: null,
        },
      );
    }

    return this.response({
      attempts,
      error: {
        category: finalAttempt?.errorCategory ?? 'config',
        message: finalAttempt?.message ?? 'No available AI model for this use case',
      },
      generatedAt: new Date().toISOString(),
      request,
      requestFormat: finalAttempt?.requestFormat ?? null,
      status: 'failure',
      target: finalTarget,
      text: '',
      usage,
    });
  }

  async stream(ownerId: string, request: AiInvokeRequest, sink: InvokeStreamSink): Promise<void> {
    const requestId = randomUUID();
    const catalog = await this.catalogStore.getCatalog(ownerId);
    const targets = await this.attemptTargets(catalog, request);
    const attempts: AiInvokeAttempt[] = [];
    let finalFailureTarget: AttemptTarget | null = null;

    for (const target of targets) {
      if (sink.signal?.aborted) return;
      const validationFailure = await this.validateTarget(ownerId, target);
      const requestFormat = this.resolvedRequestFormat(target, request);
      if (validationFailure) {
        const attempt = this.failedAttempt(target, requestFormat, null, validationFailure);
        attempts.push(attempt);
        finalFailureTarget = target;
        await sink.emit({ type: 'attempt', attempt });
        if (!validationFailure.retryable) break;
        continue;
      }

      if (target.provider.credentialMode === 'platform_managed' && !target.channel) {
        const failure = this.invokeError(
          'config',
          'Platform-managed AI provider channel is not configured',
          true,
        );
        const attempt = this.failedAttempt(target, requestFormat, null, failure);
        attempts.push(attempt);
        finalFailureTarget = target;
        await sink.emit({ type: 'attempt', attempt });
        continue;
      }
      const reserveFailure = await this.reserveCredits(ownerId, target, request);
      if (reserveFailure) {
        const attempt = this.failedAttempt(target, requestFormat, null, reserveFailure);
        attempts.push(attempt);
        finalFailureTarget = target;
        await sink.emit({ type: 'attempt', attempt });
        break;
      }

      await sink.emit({
        type: 'start',
        requestId,
        providerId: target.provider.id,
        providerName: target.provider.name,
        modelId: target.model.id,
        modelName: target.model.displayName,
        requestFormat,
        generatedAt: new Date().toISOString(),
      });

      const startedAt = Date.now();
      let emittedDelta = false;
      try {
        const result = await this.streamUpstream(
          {
            target,
            request,
            requestFormat,
            secret: await this.providerSecret(ownerId, target),
          },
          sink.signal,
          async ({ text }) => {
            emittedDelta = true;
            await sink.emit({ type: 'delta', text });
          },
        );
        const status: AiUsageStatus = attempts.some((attempt) => attempt.status === 'failure')
          ? 'degraded'
          : 'success';
        const usageBase = this.invokeUsageBase(request, result);
        const settlement = await this.settleUsage(target, usageBase, target.channel);
        const usage = this.userVisibleUsage(usageBase, settlement);
        const attempt: AiInvokeAttempt = {
          providerId: target.provider.id,
          providerName: target.provider.name,
          modelId: target.model.id,
          modelName: target.model.displayName,
          requestFormat,
          status,
          latencyMs: result.latencyMs,
          errorCategory: null,
        };
        attempts.push(attempt);
        await sink.emit({ type: 'attempt', attempt });
        await this.recordUsage({
          ownerId,
          request,
          requestId,
          target,
          channel: target.channel,
          status,
          usage,
          settlement,
          latencyMs: result.latencyMs,
          errorCategory: null,
          upstreamRequestId: result.upstreamRequestId,
        });
        await sink.emit({
          type: 'final',
          response: this.response({
            attempts,
            error: null,
            generatedAt: new Date().toISOString(),
            request,
            requestFormat,
            status,
            target,
            text: result.text,
            usage,
          }),
        });
        return;
      } catch (error) {
        const failure = this.classifyError(error);
        const attempt = this.failedAttempt(target, requestFormat, Date.now() - startedAt, failure);
        attempts.push(attempt);
        finalFailureTarget = target;
        await sink.emit({ type: 'attempt', attempt });
        if (!emittedDelta && failure.retryable && !sink.signal?.aborted) continue;

        await this.recordUsage({
          ownerId,
          request,
          requestId,
          target,
          channel: target.channel,
          status: 'failure',
          usage: this.emptyUsage(),
          settlement: this.emptySettlement(),
          latencyMs: attempt.latencyMs,
          errorCategory: failure.category,
          upstreamRequestId: null,
        });
        await sink.emit({
          type: 'error',
          errorCategory: failure.category,
          message: failure.message,
          attempts,
        });
        return;
      }
    }

    const finalAttempt = [...attempts].reverse().find((attempt) => attempt.status === 'failure');
    const finalTarget = finalFailureTarget ?? (finalAttempt ? this.targetFromAttempt(catalog, finalAttempt) : null);
    if (finalAttempt && finalTarget) {
      await this.recordUsage({
        ownerId,
        request,
        requestId,
        target: finalTarget,
        channel: finalTarget.channel,
        status: 'failure',
        usage: this.emptyUsage(),
        settlement: this.emptySettlement(),
        latencyMs: finalAttempt.latencyMs,
        errorCategory: finalAttempt.errorCategory,
        upstreamRequestId: null,
      });
    }
    await sink.emit({
      type: 'error',
      errorCategory: finalAttempt?.errorCategory ?? 'config',
      message: finalAttempt?.message ?? 'No available AI model for this use case',
      attempts,
    });
  }

  private async attemptTargets(catalog: AiGatewayCatalog, request: AiInvokeRequest): Promise<AttemptTarget[]> {
    const assignment = catalog.assignments.find((item) => item.useCase === request.useCase);
    const modelIds = this.unique([
      request.modelId,
      assignment?.primaryModelId,
      ...(request.fallbackModelIds ?? []),
      ...(assignment?.fallbackModelIds ?? []),
    ]);
    const baseTargets = modelIds
      .map((modelId) => {
        const model = catalog.models.find((item) => item.id === modelId);
        if (!model) return null;
        const provider = catalog.providers.find((item) => item.id === model.providerId);
        if (!provider) return null;
        return { model, provider };
      })
      .filter((target): target is AttemptTarget => Boolean(target));
    const targets: AttemptTarget[] = [];
    for (const target of baseTargets) {
      if (target.provider.credentialMode !== 'platform_managed') {
        targets.push(target);
        continue;
      }
      const channels = await this.catalogStore.getSystemProviderChannels(
        target.provider.id,
        target.model.id,
      );
      if (channels.length === 0) {
        targets.push(target);
        continue;
      }
      targets.push(...channels.map((channel) => ({ ...target, channel })));
    }
    return targets;
  }

  private async validateTarget(ownerId: string, target: AttemptTarget): Promise<InvokeFailure | null> {
    if (target.provider.status !== 'enabled') {
      return {
        category: 'config',
        message: 'AI provider is not enabled',
        retryable: true,
      };
    }
    if (!target.model.enabled) {
      return {
        category: 'config',
        message: 'AI model is not enabled',
        retryable: true,
      };
    }
    if (target.model.availability === 'offline' || target.model.availability === 'config_required') {
      return {
        category: 'config',
        message: 'AI model is not currently available',
        retryable: true,
      };
    }
    if (target.provider.credentialMode === 'user_api_key') {
      const secret = await this.catalogStore.getProviderSecret(ownerId, target.provider.id);
      if (!secret?.secret) {
        return {
          category: 'config',
          message: 'AI provider credential is missing',
          retryable: true,
        };
      }
    }
    return null;
  }

  private async providerSecret(ownerId: string, target: AttemptTarget): Promise<string> {
    if (target.provider.credentialMode === 'not_required') return '';
    if (target.provider.credentialMode === 'platform_managed') {
      return target.channel?.secret ?? '';
    }
    const value = await this.catalogStore.getProviderSecret(ownerId, target.provider.id);
    return value?.secret ?? '';
  }

  private resolvedRequestFormat(
    target: AttemptTarget,
    request: AiInvokeRequest,
  ): AiProviderRequestFormat {
    return target.channel?.requestFormat ?? request.requestFormat ?? target.provider.requestFormat ?? 'openai_compatible';
  }

  private async invokeUpstream({
    target,
    request,
    requestFormat,
    secret,
  }: {
    target: AttemptTarget;
    request: AiInvokeRequest;
    requestFormat: AiProviderRequestFormat;
    secret: string;
  }): Promise<InvokeSuccess> {
    const provider = target.channel
      ? {
          ...target.provider,
          baseUrl: target.channel.upstreamBaseUrl,
          authType: target.channel.authType,
          requestFormat: target.channel.requestFormat,
        }
      : target.provider;
    const model = target.channel
      ? {
          ...target.model,
          name: target.channel.upstreamModelName,
        }
      : target.model;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const result = await this.adapterRegistry.adapterFor(requestFormat).invoke({
        provider,
        model,
        request,
        secret,
        parameterConfig: target.channel?.parameterConfig ?? {},
        signal: controller.signal,
      });
      return {
        ...result,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw this.invokeError('timeout', 'AI provider request timed out', true);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async streamUpstream(
    {
      target,
      request,
      requestFormat,
      secret,
    }: {
      target: AttemptTarget;
      request: AiInvokeRequest;
      requestFormat: AiProviderRequestFormat;
      secret: string;
    },
    externalSignal: AbortSignal | undefined,
    onDelta: (delta: { text: string }) => void | Promise<void>,
  ): Promise<InvokeSuccess> {
    const provider = target.channel
      ? {
          ...target.provider,
          baseUrl: target.channel.upstreamBaseUrl,
          authType: target.channel.authType,
          requestFormat: target.channel.requestFormat,
        }
      : target.provider;
    const model = target.channel
      ? {
          ...target.model,
          name: target.channel.upstreamModelName,
        }
      : target.model;
    const startedAt = Date.now();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const abort = () => controller.abort();
    externalSignal?.addEventListener('abort', abort, { once: true });
    try {
      const result = await this.adapterRegistry.adapterFor(requestFormat).stream(
        {
          provider,
          model,
          request,
          secret,
          parameterConfig: target.channel?.parameterConfig ?? {},
          signal: controller.signal,
        },
        onDelta,
      );
      return {
        ...result,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw timedOut
          ? this.invokeError('timeout', 'AI provider stream timed out', true)
          : this.invokeError('timeout', 'AI provider stream was interrupted', true);
      }
      throw error;
    } finally {
      externalSignal?.removeEventListener('abort', abort);
      clearTimeout(timeout);
    }
  }

  private invokeError(
    category: AiInvokeErrorCategory,
    message: string,
    retryable: boolean,
  ): InvokeFailure {
    return { category, message: sanitizedAiMessage(message), retryable };
  }

  private classifyError(error: unknown): InvokeFailure {
    if (error instanceof InvokeError) {
      return {
        category: error.category,
        message: error.message,
        retryable: error.retryable,
      };
    }
    if (this.isInvokeFailure(error)) return error;
    if (error instanceof Error) {
      return this.invokeError('unknown', error.message || 'AI provider request failed', true);
    }
    return this.invokeError('unknown', 'AI provider request failed', true);
  }

  private isInvokeFailure(error: unknown): error is InvokeFailure {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'category' in error &&
        'message' in error &&
        'retryable' in error,
    );
  }

  private failedAttempt(
    target: AttemptTarget,
    requestFormat: AiProviderRequestFormat,
    latencyMs: number | null,
    failure: InvokeFailure,
  ): AiInvokeAttempt {
    return {
      providerId: target.provider.id,
      providerName: target.provider.name,
      modelId: target.model.id,
      modelName: target.model.displayName,
      requestFormat,
      status: 'failure',
      latencyMs,
      errorCategory: failure.category,
      message: failure.message,
    };
  }

  private response({
    attempts,
    error,
    generatedAt,
    request,
    requestFormat,
    status,
    target,
    text,
    usage,
  }: {
    attempts: AiInvokeAttempt[];
    error: { category: AiInvokeErrorCategory; message: string } | null;
    generatedAt: string;
    request: AiInvokeRequest;
    requestFormat: AiProviderRequestFormat | null;
    status: AiUsageStatus;
    target: AttemptTarget | null;
    text: string;
    usage: AiInvokeUsage;
  }): AiInvokeResponse {
    return {
      generatedAt,
      status,
      useCase: request.useCase,
      providerId: target?.provider.id ?? null,
      providerName: target?.provider.name ?? null,
      modelId: target?.model.id ?? null,
      modelName: target?.model.displayName ?? null,
      requestFormat,
      text,
      degraded: status === 'degraded',
      usage,
      attempts,
      errorCategory: error?.category ?? null,
      message: error?.message ?? null,
    };
  }

  private async recordUsage(
    input: {
      ownerId: string;
      request: AiInvokeRequest;
      requestId: string;
      target: AttemptTarget;
      channel: SystemProviderChannel | null | undefined;
      status: AiUsageStatus;
      usage: AiInvokeUsage;
      settlement: UsageSettlement;
      latencyMs: number | null;
      errorCategory: AiInvokeErrorCategory | null;
      upstreamRequestId: string | null;
    },
  ): Promise<void> {
    await this.usageStore.recordEvent(input.ownerId, {
      kind: 'invoke',
      status: input.status,
      useCase: input.request.useCase,
      providerId: input.target.provider.id,
      providerName: input.target.provider.name,
      modelId: input.target.model.id,
      modelName: input.target.model.displayName,
      promptTokens: input.usage.promptTokens,
      completionTokens: input.usage.completionTokens,
      creditAmount: input.settlement.creditAmount,
      billingMode: input.target.provider.billingMode,
      requestId: input.requestId,
      upstreamRequestId: input.upstreamRequestId,
      internalProviderId: input.channel?.internalProviderId ?? null,
      internalProviderModelId: input.channel?.id ?? null,
      usageEstimated: input.usage.usageEstimated,
      estimatedCostUsd: input.settlement.estimatedCostUsd,
      estimatedCostAmount: input.settlement.estimatedCostAmount,
      estimatedCostCurrency: input.settlement.estimatedCostCurrency,
      billingSnapshot: input.settlement.billingSnapshot,
      latencyMs: input.latencyMs,
      errorCategory: input.errorCategory,
    });
  }

  private invokeUsageBase(request: AiInvokeRequest, result: InvokeSuccess): AiInvokeUsage {
    const reportedPromptTokens = result.promptTokens;
    const reportedCompletionTokens = result.completionTokens;
    const usageEstimated = reportedPromptTokens + reportedCompletionTokens === 0;
    const promptTokens = usageEstimated
      ? this.estimateTextTokens(request.messages.map((message) => message.content).join('\n'))
      : reportedPromptTokens;
    const completionTokens = usageEstimated ? this.estimateTextTokens(result.text) : reportedCompletionTokens;
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      creditAmount: 0,
      usageEstimated,
      estimatedCostUsd: 0,
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
    };
  }

  private async reserveCredits(
    ownerId: string,
    target: AttemptTarget,
    request: AiInvokeRequest,
  ): Promise<InvokeFailure | null> {
    if (target.provider.billingMode !== 'platform_credits') return null;
    try {
      await this.creditStore.assertSufficientReserve(ownerId, target.model, request);
      return null;
    } catch {
      return this.invokeError('quota', 'Dicha credits are insufficient for this AI request', false);
    }
  }

  private async settleUsage(
    target: AttemptTarget,
    usage: AiInvokeUsage,
    channel: SystemProviderChannel | null | undefined,
  ): Promise<UsageSettlement> {
    if (target.provider.billingMode !== 'platform_credits') return this.emptySettlement();
    const charge = await this.creditStore.calculateCharge(
      target.model,
      usage.promptTokens,
      usage.completionTokens,
    );
    const cost = this.estimatedCost(target.model, usage.promptTokens, usage.completionTokens);
    return {
      ...cost,
      creditAmount: charge.amount,
      billingSnapshot: this.billingSnapshot(target, channel, usage, charge),
    };
  }

  private userVisibleUsage(usage: AiInvokeUsage, settlement: UsageSettlement): AiInvokeUsage {
    return {
      ...usage,
      creditAmount: settlement.creditAmount,
      estimatedCostUsd: 0,
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
    };
  }

  private billingSnapshot(
    target: AttemptTarget,
    channel: SystemProviderChannel | null | undefined,
    usage: AiInvokeUsage,
    charge: CreditCharge,
  ): Record<string, unknown> {
    return {
      ...charge.snapshot,
      publicProviderId: target.provider.id,
      publicModelId: target.model.id,
      internalProviderId: channel?.internalProviderId ?? null,
      internalProviderModelId: channel?.id ?? null,
      upstreamModelName: channel?.upstreamModelName ?? null,
      usageEstimated: usage.usageEstimated,
    };
  }

  private estimatedCost(
    model: AiModel,
    promptTokens: number,
    completionTokens: number,
  ): Pick<AiInvokeUsage, 'estimatedCostAmount' | 'estimatedCostCurrency' | 'estimatedCostUsd'> {
    if (!model.pricing || !this.isSettlementCurrency(model.pricing.currency)) {
      return {
        estimatedCostUsd: 0,
        estimatedCostAmount: 0,
        estimatedCostCurrency: null,
      };
    }
    const currency = model.pricing.currency;
    const inputRate = model.pricing.inputPerMillionTokens ?? this.unitRate(model, 'textInput');
    const outputRate = model.pricing.outputPerMillionTokens ?? this.unitRate(model, 'textOutput');
    const cost =
      ((inputRate ?? 0) * promptTokens + (outputRate ?? 0) * completionTokens) / 1_000_000;
    const amount = Number(cost.toFixed(6));
    return {
      estimatedCostUsd: currency === 'USD' ? amount : 0,
      estimatedCostAmount: amount,
      estimatedCostCurrency: currency,
    };
  }

  private unitRate(model: AiModel, name: string): number | undefined {
    return model.pricing?.units?.find((unit) => unit.name === name && unit.strategy === 'fixed')?.rate;
  }

  private isSettlementCurrency(value: string): value is AiSettlementCurrency {
    return value === 'USD' || value === 'CNY';
  }

  private emptyUsage(): AiInvokeUsage {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      creditAmount: 0,
      usageEstimated: false,
      estimatedCostUsd: 0,
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
    };
  }

  private emptySettlement(): UsageSettlement {
    return {
      creditAmount: 0,
      estimatedCostUsd: 0,
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
      billingSnapshot: null,
    };
  }

  private estimateTextTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  private targetFromAttempt(catalog: AiGatewayCatalog, attempt: AiInvokeAttempt): AttemptTarget | null {
    const model = catalog.models.find((item) => item.id === attempt.modelId);
    const provider = catalog.providers.find((item) => item.id === attempt.providerId);
    return model && provider ? { model, provider } : null;
  }

  private unique(values: Array<string | undefined>): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      if (!value || seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
    return result;
  }
}
