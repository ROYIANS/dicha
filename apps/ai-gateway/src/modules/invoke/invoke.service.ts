import { Injectable } from '@nestjs/common';
import type {
  AiGatewayCatalog,
  AiInvokeAttempt,
  AiInvokeErrorCategory,
  AiInvokeRequest,
  AiInvokeResponse,
  AiInvokeUsage,
  AiModel,
  AiProvider,
  AiProviderRequestFormat,
  AiUsageStatus,
} from '@dicha/shared';
import { CatalogStore } from '../catalog/catalog.store';
import type { SystemProviderChannel } from '../catalog/catalog.store';
import { UsageStore } from '../usage/usage.store';

type InvokeSuccess = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
};

type InvokeFailure = {
  category: AiInvokeErrorCategory;
  message: string;
  retryable: boolean;
};

type AttemptTarget = {
  model: AiModel;
  provider: AiProvider;
};

type ProviderSecret = {
  secret: string;
  channel?: SystemProviderChannel;
};

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_TOKENS = 1024;

@Injectable()
export class InvokeService {
  constructor(
    private readonly catalogStore: CatalogStore,
    private readonly usageStore: UsageStore,
  ) {}

  async invoke(ownerId: string, request: AiInvokeRequest): Promise<AiInvokeResponse> {
    const catalog = await this.catalogStore.getCatalog(ownerId);
    const targets = this.attemptTargets(catalog, request);
    const attempts: AiInvokeAttempt[] = [];

    for (const target of targets) {
      const validationFailure = await this.validateTarget(ownerId, target);
      const requestFormat = request.requestFormat ?? target.provider.requestFormat ?? 'openai_compatible';
      if (validationFailure) {
        attempts.push(this.failedAttempt(target, requestFormat, null, validationFailure));
        if (!validationFailure.retryable) break;
        continue;
      }

      const secret = await this.providerSecret(ownerId, target);
      const resolvedRequestFormat = secret.channel?.requestFormat ?? requestFormat;
      if (target.provider.credentialMode === 'platform_managed' && !secret.channel) {
        const failure = this.invokeError(
          'config',
          'Platform-managed AI provider channel is not configured',
          true,
        );
        attempts.push(this.failedAttempt(target, resolvedRequestFormat, null, failure));
        continue;
      }
      const startedAt = Date.now();
      try {
        const result = await this.invokeUpstream({
          model: target.model,
          provider: target.provider,
          request,
          requestFormat: resolvedRequestFormat,
          secret,
        });
        const status: AiUsageStatus = attempts.some((attempt) => attempt.status === 'failure')
          ? 'degraded'
          : 'success';
        const usage = this.invokeUsage(target.model, result);
        attempts.push({
          providerId: target.provider.id,
          providerName: target.provider.name,
          modelId: target.model.id,
          modelName: target.model.displayName,
          requestFormat: resolvedRequestFormat,
          status,
          latencyMs: result.latencyMs,
          errorCategory: null,
        });
        await this.recordUsage(ownerId, request, target, status, usage, result.latencyMs, null);
        return this.response({
          attempts,
          error: null,
          generatedAt: new Date().toISOString(),
          request,
          requestFormat: resolvedRequestFormat,
          status,
          target,
          text: result.text,
          usage,
        });
      } catch (error) {
        const failure = this.classifyError(error);
        attempts.push(this.failedAttempt(target, resolvedRequestFormat, Date.now() - startedAt, failure));
        if (!failure.retryable) break;
      }
    }

    const finalAttempt = [...attempts].reverse().find((attempt) => attempt.status === 'failure');
    const finalTarget = finalAttempt ? this.targetFromAttempt(catalog, finalAttempt) : null;
    const usage = this.emptyUsage();
    if (finalAttempt && finalTarget) {
      await this.recordUsage(
        ownerId,
        request,
        finalTarget,
        'failure',
        usage,
        finalAttempt.latencyMs,
        finalAttempt.errorCategory,
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

  private attemptTargets(catalog: AiGatewayCatalog, request: AiInvokeRequest): AttemptTarget[] {
    const assignment = catalog.assignments.find((item) => item.useCase === request.useCase);
    const modelIds = this.unique([
      request.modelId,
      assignment?.primaryModelId,
      ...(request.fallbackModelIds ?? []),
      ...(assignment?.fallbackModelIds ?? []),
    ]);
    return modelIds
      .map((modelId) => {
        const model = catalog.models.find((item) => item.id === modelId);
        if (!model) return null;
        const provider = catalog.providers.find((item) => item.id === model.providerId);
        if (!provider) return null;
        return { model, provider };
      })
      .filter((target): target is AttemptTarget => Boolean(target));
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

  private async providerSecret(ownerId: string, target: AttemptTarget): Promise<ProviderSecret> {
    if (target.provider.credentialMode === 'not_required') return { secret: '' };
    if (target.provider.credentialMode === 'platform_managed') {
      const channel = await this.catalogStore.getSystemProviderChannel(
        target.provider.id,
        target.model.id,
      );
      return {
        secret: channel?.secret ?? '',
        ...(channel ? { channel } : {}),
      };
    }
    const value = await this.catalogStore.getProviderSecret(ownerId, target.provider.id);
    return { secret: value?.secret ?? '' };
  }

  private async invokeUpstream({
    model: requestedModel,
    provider: requestedProvider,
    request,
    requestFormat,
    secret,
  }: {
    model: AiModel;
    provider: AiProvider;
    request: AiInvokeRequest;
    requestFormat: AiProviderRequestFormat;
    secret: ProviderSecret;
  }): Promise<InvokeSuccess> {
    const provider = secret.channel
      ? {
          ...requestedProvider,
          baseUrl: secret.channel.upstreamBaseUrl,
          authType: secret.channel.authType,
          requestFormat: secret.channel.requestFormat,
        }
      : requestedProvider;
    const model = secret.channel
      ? {
          ...requestedModel,
          name: secret.channel.upstreamModelName,
        }
      : requestedModel;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const result =
        requestFormat === 'anthropic_messages'
          ? await this.invokeAnthropic(provider, model, request, secret, controller.signal)
          : requestFormat === 'openai_responses'
            ? await this.invokeOpenAiResponses(provider, model, request, secret, controller.signal)
            : await this.invokeOpenAiCompatible(provider, model, request, secret, controller.signal);
      return {
        ...result,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (this.isAbortError(error)) {
        throw this.invokeError('timeout', 'AI provider request timed out', true);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async invokeOpenAiCompatible(
    provider: AiProvider,
    model: AiModel,
    request: AiInvokeRequest,
    secret: ProviderSecret,
    signal: AbortSignal,
  ): Promise<Omit<InvokeSuccess, 'latencyMs'>> {
    const body = await this.postJson(
      `${this.openAiBaseUrl(provider.baseUrl)}/chat/completions`,
      {
        model: model.name,
        messages: request.messages,
        stream: false,
        ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      },
      this.openAiHeaders(provider, secret),
      signal,
    );
    const text =
      this.asString(body, ['choices', 0, 'message', 'content']) ??
      this.asString(body, ['choices', 0, 'text']) ??
      '';
    if (!text) {
      throw this.invokeError('unknown', 'AI provider returned an empty completion', true);
    }
    return {
      text,
      promptTokens: this.asNumber(body, ['usage', 'prompt_tokens']) ?? 0,
      completionTokens: this.asNumber(body, ['usage', 'completion_tokens']) ?? 0,
    };
  }

  private async invokeOpenAiResponses(
    provider: AiProvider,
    model: AiModel,
    request: AiInvokeRequest,
    secret: ProviderSecret,
    signal: AbortSignal,
  ): Promise<Omit<InvokeSuccess, 'latencyMs'>> {
    const system = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const input = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));
    const body = await this.postJson(
      `${this.openAiBaseUrl(provider.baseUrl)}/responses`,
      {
        model: model.name,
        input,
        stream: false,
        ...(system ? { instructions: system } : {}),
        ...(request.maxTokens ? { max_output_tokens: request.maxTokens } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      },
      this.openAiHeaders(provider, secret),
      signal,
    );
    const text = this.openAiResponsesText(body);
    if (!text) {
      throw this.invokeError('unknown', 'AI provider returned an empty response', true);
    }
    return {
      text,
      promptTokens: this.asNumber(body, ['usage', 'input_tokens']) ?? 0,
      completionTokens: this.asNumber(body, ['usage', 'output_tokens']) ?? 0,
    };
  }

  private async invokeAnthropic(
    provider: AiProvider,
    model: AiModel,
    request: AiInvokeRequest,
    secret: ProviderSecret,
    signal: AbortSignal,
  ): Promise<Omit<InvokeSuccess, 'latencyMs'>> {
    const system = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const messages = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }));
    const body = await this.postJson(
      `${this.anthropicBaseUrl(provider.baseUrl)}/v1/messages`,
      {
        model: model.name,
        messages,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(system ? { system } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      },
      this.anthropicHeaders(secret),
      signal,
    );
    const text = this.anthropicText(body);
    if (!text) {
      throw this.invokeError('unknown', 'AI provider returned an empty response', true);
    }
    return {
      text,
      promptTokens: this.asNumber(body, ['usage', 'input_tokens']) ?? 0,
      completionTokens: this.asNumber(body, ['usage', 'output_tokens']) ?? 0,
    };
  }

  private async postJson(
    url: string,
    body: unknown,
    headers: Record<string, string>,
    signal: AbortSignal,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (this.isAbortError(error)) throw error;
      throw this.invokeError('network', 'AI provider network request failed', true);
    }

    const raw = await response.text();
    const parsed = raw ? this.safeJson(raw) : {};
    if (!response.ok) {
      throw this.upstreamError(response.status, parsed, raw);
    }
    return parsed;
  }

  private openAiHeaders(provider: AiProvider, secret: ProviderSecret): Record<string, string> {
    if (provider.authType === 'none' || !secret.secret) return {};
    return { authorization: `Bearer ${secret.secret}` };
  }

  private anthropicHeaders(secret: ProviderSecret): Record<string, string> {
    return {
      'anthropic-version': '2023-06-01',
      ...(secret.secret ? { 'x-api-key': secret.secret } : {}),
    };
  }

  private openAiBaseUrl(baseUrl: string): string {
    return baseUrl
      .replace(/\/+$/, '')
      .replace(/\/(?:chat\/completions|responses)\/?$/, '');
  }

  private anthropicBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '').replace(/\/v1(?:\/messages)?\/?$/, '');
  }

  private upstreamError(status: number, parsed: unknown, raw: string): InvokeFailure {
    const message = this.sanitizedMessage(
      (this.asString(parsed, ['error', 'message']) ??
        this.asString(parsed, ['message']) ??
        raw) ||
        `AI provider request failed (${status})`,
    );
    if (status === 401 || status === 403) return this.invokeError('auth', message, false);
    if (status === 402) return this.invokeError('quota', message, false);
    if (status === 404) return this.invokeError('model_not_found', message, true);
    if (status === 408 || status === 409 || status === 423 || status === 425) {
      return this.invokeError('provider_unavailable', message, true);
    }
    if (status === 429) return this.invokeError('rate_limit', message, true);
    if (status >= 500) return this.invokeError('provider_unavailable', message, true);

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('context') || lowerMessage.includes('token')) {
      return this.invokeError('context_limit', message, false);
    }
    if (lowerMessage.includes('safety') || lowerMessage.includes('moderation') || lowerMessage.includes('policy')) {
      return this.invokeError('content_safety', message, false);
    }
    return this.invokeError('invalid_request', message, false);
  }

  private invokeError(
    category: AiInvokeErrorCategory,
    message: string,
    retryable: boolean,
  ): InvokeFailure {
    return { category, message: this.sanitizedMessage(message), retryable };
  }

  private classifyError(error: unknown): InvokeFailure {
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
    ownerId: string,
    request: AiInvokeRequest,
    target: AttemptTarget,
    status: AiUsageStatus,
    usage: AiInvokeUsage,
    latencyMs: number | null,
    errorCategory: AiInvokeErrorCategory | null,
  ): Promise<void> {
    await this.usageStore.recordEvent(ownerId, {
      kind: 'invoke',
      status,
      useCase: request.useCase,
      providerId: target.provider.id,
      providerName: target.provider.name,
      modelId: target.model.id,
      modelName: target.model.displayName,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      latencyMs,
      errorCategory,
    });
  }

  private invokeUsage(model: AiModel, result: InvokeSuccess): AiInvokeUsage {
    const promptTokens = result.promptTokens;
    const completionTokens = result.completionTokens;
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: this.estimatedCostUsd(model, promptTokens, completionTokens),
    };
  }

  private estimatedCostUsd(model: AiModel, promptTokens: number, completionTokens: number): number {
    if (!model.pricing || model.pricing.currency !== 'USD') return 0;
    const inputRate = model.pricing.inputPerMillionTokens ?? this.unitRate(model, 'textInput');
    const outputRate = model.pricing.outputPerMillionTokens ?? this.unitRate(model, 'textOutput');
    const cost =
      ((inputRate ?? 0) * promptTokens + (outputRate ?? 0) * completionTokens) / 1_000_000;
    return Number(cost.toFixed(6));
  }

  private unitRate(model: AiModel, name: string): number | undefined {
    return model.pricing?.units?.find((unit) => unit.name === name && unit.strategy === 'fixed')?.rate;
  }

  private emptyUsage(): AiInvokeUsage {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
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

  private safeJson(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }

  private asString(value: unknown, path: Array<string | number>): string | undefined {
    const item = this.pathValue(value, path);
    return typeof item === 'string' ? item : undefined;
  }

  private asNumber(value: unknown, path: Array<string | number>): number | undefined {
    const item = this.pathValue(value, path);
    return typeof item === 'number' && Number.isFinite(item) ? item : undefined;
  }

  private pathValue(value: unknown, path: Array<string | number>): unknown {
    let current = value;
    for (const key of path) {
      if (!current || typeof current !== 'object') return undefined;
      if (Array.isArray(current)) {
        if (typeof key !== 'number') return undefined;
        current = current[key];
        continue;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  private openAiResponsesText(value: unknown): string {
    const outputText = this.asString(value, ['output_text']);
    if (outputText) return outputText;
    const output = this.pathValue(value, ['output']);
    if (!Array.isArray(output)) return '';
    return output
      .flatMap((item) => {
        const content = this.pathValue(item, ['content']);
        return Array.isArray(content) ? content : [];
      })
      .map((item) => this.asString(item, ['text']) ?? this.asString(item, ['content']) ?? '')
      .filter(Boolean)
      .join('\n');
  }

  private anthropicText(value: unknown): string {
    const content = this.pathValue(value, ['content']);
    if (!Array.isArray(content)) return '';
    return content
      .map((item) => this.asString(item, ['text']) ?? '')
      .filter(Boolean)
      .join('\n');
  }

  private sanitizedMessage(value: string): string {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
      .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]')
      .slice(0, 500);
  }
}
