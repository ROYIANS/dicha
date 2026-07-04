import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodError } from 'zod';
import {
  AiConfigUpdateResponseSchema,
  AiGatewayCatalogSchema,
  AiInvokeRequestSchema,
  AiInvokeResponseSchema,
  AiProviderCheckResponseSchema,
  AiProviderSyncModelsResponseSchema,
  AiUsageReportSchema,
  type AiConfigUpdate,
  type AiConfigUpdateResponse,
  type AiGatewayCatalog,
  type AiInvokeRequest,
  type AiInvokeResponse,
  type AiProviderCheckBody,
  type AiProviderCheckResponse,
  type AiProviderSyncModelsBody,
  type AiProviderSyncModelsResponse,
  type AiUsageQuery,
  type AiUsageReport,
} from '@dicha/shared';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly baseUrl: string;
  private readonly internalToken: string | undefined;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .get<string>('AI_GATEWAY_BASE_URL', 'http://localhost:3100/ai')
      .replace(/\/+$/, '');
    this.internalToken = config.get<string>('AI_GATEWAY_INTERNAL_TOKEN');
  }

  getCatalog(ownerId: string): Promise<AiGatewayCatalog> {
    return this.request('/catalog', {
      method: 'GET',
      ownerId,
      schema: AiGatewayCatalogSchema,
    });
  }

  updateConfig(ownerId: string, body: AiConfigUpdate): Promise<AiConfigUpdateResponse> {
    return this.request('/config', {
      method: 'PATCH',
      ownerId,
      body,
      schema: AiConfigUpdateResponseSchema,
    });
  }

  syncProviderModels(
    ownerId: string,
    body: AiProviderSyncModelsBody,
  ): Promise<AiProviderSyncModelsResponse> {
    return this.request('/providers/sync-models', {
      method: 'POST',
      ownerId,
      body,
      schema: AiProviderSyncModelsResponseSchema,
    });
  }

  checkProviderConnection(
    ownerId: string,
    body: AiProviderCheckBody,
  ): Promise<AiProviderCheckResponse> {
    return this.request('/providers/check', {
      method: 'POST',
      ownerId,
      body,
      schema: AiProviderCheckResponseSchema,
    });
  }

  getUsage(ownerId: string, query: AiUsageQuery): Promise<AiUsageReport> {
    return this.request(`/usage?window=${encodeURIComponent(query.window)}`, {
      method: 'GET',
      ownerId,
      schema: AiUsageReportSchema,
    });
  }

  invoke(ownerId: string, body: AiInvokeRequest): Promise<AiInvokeResponse> {
    return this.request('/invoke', {
      method: 'POST',
      ownerId,
      body,
      schema: AiInvokeResponseSchema,
    });
  }

  async streamInvoke(
    ownerId: string,
    body: AiInvokeRequest,
    signal: AbortSignal,
  ): Promise<Response> {
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('accept', 'text/event-stream');
    if (this.internalToken) {
      headers.set('x-ai-gateway-token', this.internalToken);
    }
    headers.set('x-dicha-user-id', ownerId);

    try {
      const response = await fetch(`${this.baseUrl}/invoke/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(AiInvokeRequestSchema.parse(body)),
        signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(
          await this.gatewayErrorMessage(response, `${this.baseUrl}/invoke/stream`),
        );
      }
      if (!response.body) {
        throw new BadGatewayException('AI Gateway returned an empty stream');
      }
      return response;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof ZodError) {
        throw new BadGatewayException('AI Gateway stream request shape mismatch');
      }
      this.logger.error(
        `AI Gateway stream unavailable at ${this.baseUrl}/invoke/stream: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('AI Gateway is unavailable');
    }
  }

  private async request<T>(
    path: string,
    options: {
      method: 'GET' | 'PATCH' | 'POST';
      ownerId: string;
      body?: unknown;
      schema: { parse: (value: unknown) => T };
    },
  ): Promise<T> {
    const headers = new Headers();
    if (options.body) {
      headers.set('content-type', 'application/json');
    }
    if (this.internalToken) {
      headers.set('x-ai-gateway-token', this.internalToken);
    }
    headers.set('x-dicha-user-id', options.ownerId);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new BadGatewayException(
          await this.gatewayErrorMessage(response, `${this.baseUrl}${path}`),
        );
      }

      return options.schema.parse(await response.json());
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof ZodError) {
        this.logger.error(`AI Gateway response shape mismatch from ${this.baseUrl}${path}`);
        throw new BadGatewayException('AI Gateway returned an invalid response');
      }
      this.logger.error(
        `AI Gateway request unavailable at ${this.baseUrl}${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('AI Gateway is unavailable');
    }
  }

  private async gatewayErrorMessage(response: Response, url: string): Promise<string> {
    const fallback = `AI Gateway request failed (${response.status})`;
    const raw = await response.text().catch(() => '');
    if (!raw) return fallback;

    try {
      const body = JSON.parse(raw) as unknown;
      const message = this.extractGatewayMessage(body);
      if (message) {
        return `${fallback}: ${message}`;
      }
    } catch {
      return `${fallback}: ${raw.slice(0, 500)}`;
    }

    this.logger.warn(`AI Gateway error body from ${url}: ${raw.slice(0, 1000)}`);
    return fallback;
  }

  private extractGatewayMessage(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const value = body as Record<string, unknown>;
    if (typeof value.message === 'string') return value.message;
    if (Array.isArray(value.message)) return value.message.join('; ');
    if (typeof value.error === 'string') return value.error;
    return null;
  }
}
