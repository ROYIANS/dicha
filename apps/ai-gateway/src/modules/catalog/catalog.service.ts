import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  AiConfigUpdate,
  AiConfigUpdateResponse,
  AiGatewayCatalog,
  AiProviderCheckBody,
  AiProviderCheckResponse,
  AiProviderSyncModelsBody,
  AiProviderSyncModelsResponse,
} from '@dicha/shared';
import { CatalogStore } from './catalog.store';

const OPENAI_MODELS_PATH = '/models';

type OpenAiModelsResponse = {
  data?: Array<{ id?: unknown }>;
};

@Injectable()
export class CatalogService {
  constructor(private readonly store: CatalogStore) {}

  getCatalog(ownerId: string): Promise<AiGatewayCatalog> {
    return this.store.getCatalog(ownerId);
  }

  async updateConfig(ownerId: string, update: AiConfigUpdate): Promise<AiConfigUpdateResponse> {
    return { catalog: await this.store.updateConfig(ownerId, update) };
  }

  async syncProviderModels(
    ownerId: string,
    body: AiProviderSyncModelsBody,
  ): Promise<AiProviderSyncModelsResponse> {
    const provider = await this.store.getProvider(ownerId, body.providerId);
    if (!provider) {
      throw new BadRequestException('Unknown AI provider');
    }
    if (provider.modelSyncMode !== 'openai_models_endpoint') {
      throw new BadRequestException('Provider does not support upstream model sync');
    }

    const secret = await this.store.getProviderSecret(ownerId, body.providerId);
    if (!secret) {
      throw new BadRequestException('Provider credential is required before syncing models');
    }

    const models = await this.fetchOpenAiCompatibleModels(
      secret.provider.baseUrl,
      secret.secret,
    );
    const catalog = await this.store.mergeSyncedModels(ownerId, body.providerId, models);
    return { catalog, syncedCount: models.length };
  }

  async checkProviderConnection(
    ownerId: string,
    body: AiProviderCheckBody,
  ): Promise<AiProviderCheckResponse> {
    const checkedAt = new Date().toISOString();
    const provider = await this.store.getProvider(ownerId, body.providerId);
    if (!provider) {
      return {
        ok: false,
        providerId: body.providerId,
        checkedAt,
        message: 'Unknown AI provider',
      };
    }
    if (provider.modelSyncMode !== 'openai_models_endpoint') {
      return {
        ok: false,
        providerId: body.providerId,
        checkedAt,
        message: 'Provider does not support upstream model checks',
      };
    }

    const secret = await this.store.getProviderSecret(ownerId, body.providerId);
    if (!secret) {
      return {
        ok: false,
        providerId: body.providerId,
        checkedAt,
        message: 'Provider credential is required before checking connection',
      };
    }

    try {
      const models = await this.fetchOpenAiCompatibleModels(
        secret.provider.baseUrl,
        secret.secret,
      );
      return {
        ok: true,
        providerId: body.providerId,
        checkedAt,
        message: `Connected. ${models.length} models visible.`,
      };
    } catch (error) {
      return {
        ok: false,
        providerId: body.providerId,
        checkedAt,
        message: error instanceof Error ? error.message : 'Provider connection check failed',
      };
    }
  }

  private async fetchOpenAiCompatibleModels(baseUrl: string, secret: string): Promise<string[]> {
    const headers = secret ? { authorization: `Bearer ${secret}` } : undefined;
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${OPENAI_MODELS_PATH}`, {
      headers,
    });

    if (!response.ok) {
      throw new BadRequestException(`Provider model sync failed (${response.status})`);
    }

    const body = (await response.json()) as OpenAiModelsResponse;
    return Array.from(
      new Set(
        (body.data ?? [])
          .map((item) => (typeof item.id === 'string' ? item.id : null))
          .filter((modelId): modelId is string => Boolean(modelId)),
      ),
    );
  }
}

