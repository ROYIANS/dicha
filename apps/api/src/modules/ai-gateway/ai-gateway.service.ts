import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodError } from 'zod';
import {
  AiConfigUpdateResponseSchema,
  AiGatewayCatalogSchema,
  AiProviderCheckResponseSchema,
  AiProviderSyncModelsResponseSchema,
  type AiConfigUpdate,
  type AiConfigUpdateResponse,
  type AiGatewayCatalog,
  type AiProviderCheckBody,
  type AiProviderCheckResponse,
  type AiProviderSyncModelsBody,
  type AiProviderSyncModelsResponse,
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
        throw new BadGatewayException(`AI Gateway request failed (${response.status})`);
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
}
