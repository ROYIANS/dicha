import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  AiConfigUpdate,
  AiConfigUpdateResponse,
  AiGatewayCatalog,
  AiModel,
  AiModelCapability,
  AiModelExtensionParameter,
  AiModelType,
  AiProviderRemoteModel,
  AiProviderCheckBody,
  AiProviderCheckResponse,
  AiProviderSyncModelsBody,
  AiProviderSyncModelsResponse,
} from '@dicha/shared';
import { aiModelBank } from './catalog.seed';
import { CatalogStore } from './catalog.store';

const OPENAI_MODELS_PATH = '/models';

type OpenAiModelsResponse = {
  data?: Array<Record<string, unknown>>;
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
    const models = await this.fetchModelsWithModelBankFallback(
      provider.id,
      provider.baseUrl,
      secret?.secret,
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
    try {
      const models = await this.fetchOpenAiCompatibleModels(
        provider.baseUrl,
        secret?.secret,
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

  private async fetchOpenAiCompatibleModels(
    baseUrl: string,
    secret?: string,
  ): Promise<AiProviderRemoteModel[]> {
    const headers = secret ? { authorization: `Bearer ${secret}` } : undefined;
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${OPENAI_MODELS_PATH}`, {
      headers,
    });

    if (!response.ok) {
      throw new BadRequestException(`Provider model sync failed (${response.status})`);
    }

    const body = (await response.json()) as OpenAiModelsResponse;
    const models = new Map<string, AiProviderRemoteModel>();
    for (const item of body.data ?? []) {
      const id = typeof item.id === 'string' ? item.id : null;
      if (!id) continue;
      models.set(id, this.remoteModelDescriptor(id, item));
    }

    return [...models.values()];
  }

  private async fetchModelsWithModelBankFallback(
    providerId: string,
    baseUrl: string,
    secret?: string,
  ): Promise<AiProviderRemoteModel[]> {
    try {
      return await this.fetchOpenAiCompatibleModels(baseUrl, secret);
    } catch (error) {
      if (!secret && this.isAuthenticationFailure(error)) {
        const models = this.modelBankRemoteModels(providerId);
        if (models.length > 0) return models;
      }
      throw error;
    }
  }

  private modelBankRemoteModels(providerId: string): AiProviderRemoteModel[] {
    return aiModelBank
      .filter((model) => model.providerId === providerId)
      .map((model) => this.modelBankRemoteModel(model));
  }

  private modelBankRemoteModel(model: AiModel): AiProviderRemoteModel {
    return {
      id: model.name,
      displayName: model.displayName,
      contextWindow: model.contextWindow,
      modelType: model.modelType,
      extensionParameters: model.extensionParameters,
      capabilities: model.capabilities,
      pricing: model.pricing,
      priceHint: model.priceHint,
      maxOutput: model.maxOutput,
      releasedAt: model.releasedAt,
    };
  }

  private isAuthenticationFailure(error: unknown): boolean {
    if (!(error instanceof BadRequestException)) return false;
    const response = error.getResponse();
    if (typeof response === 'string') return response.includes('(401)') || response.includes('(403)');
    if (!response || typeof response !== 'object') return false;
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') return message.includes('(401)') || message.includes('(403)');
    if (Array.isArray(message)) {
      return message.some(
        (item) =>
          typeof item === 'string' && (item.includes('(401)') || item.includes('(403)')),
      );
    }
    return false;
  }

  private remoteModelDescriptor(id: string, item: Record<string, unknown>): AiProviderRemoteModel {
    const contextWindow = this.firstPositiveInteger(
      item.contextWindow,
      item.context_window,
      item.contextWindowTokens,
      item.context_window_tokens,
      item.context_length,
      item.max_context_length,
      item.maxInputTokens,
      item.max_input_tokens,
    );
    const capabilities = this.parseCapabilities(item);
    const modelType = this.parseModelType(item.type ?? item.modelType ?? item.model_type);
    const extensionParameters = this.parseExtensionParameters(
      item.extensionParameters ?? item.extension_parameters,
    );
    const displayName =
      typeof item.displayName === 'string'
        ? item.displayName
        : typeof item.display_name === 'string'
          ? item.display_name
          : typeof item.name === 'string'
            ? item.name
            : undefined;

    return {
      id,
      ...(displayName ? { displayName } : {}),
      ...(contextWindow ? { contextWindow } : {}),
      ...(modelType ? { modelType } : {}),
      ...(extensionParameters.length > 0 ? { extensionParameters } : {}),
      ...(capabilities.length > 0 ? { capabilities } : {}),
    };
  }

  private firstPositiveInteger(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) return parsed;
      }
    }
    return undefined;
  }

  private parseModelType(value: unknown): AiModelType | undefined {
    const allowed = new Set<AiModelType>([
      'chat',
      'embedding',
      'rerank',
      'image',
      'audio',
      'video',
      'tts',
      'asr',
      'text2music',
      'realtime',
    ]);
    return typeof value === 'string' && allowed.has(value as AiModelType)
      ? (value as AiModelType)
      : undefined;
  }

  private parseExtensionParameters(value: unknown): AiModelExtensionParameter[] {
    if (!Array.isArray(value)) return [];
    const allowed = new Set<AiModelExtensionParameter>([
      'codexMaxReasoningEffort',
      'deepseekV4ReasoningEffort',
      'disableContextCaching',
      'effort',
      'enableAdaptiveThinking',
      'enableReasoning',
      'glm5_2ReasoningEffort',
      'gpt5ReasoningEffort',
      'gpt5_1ReasoningEffort',
      'gpt5_2ProReasoningEffort',
      'gpt5_2ReasoningEffort',
      'grok4_20ReasoningEffort',
      'grok4_3ReasoningEffort',
      'hy3ReasoningEffort',
      'imageAspectRatio',
      'imageAspectRatio2',
      'imageResolution',
      'imageResolution2',
      'opus47Effort',
      'preserveThinking',
      'reasoningBudgetToken',
      'reasoningBudgetToken32k',
      'reasoningBudgetToken80k',
      'reasoningEffort',
      'ring2_6ReasoningEffort',
      'step3_5ReasoningEffort',
      'textVerbosity',
      'thinking',
      'thinkingBudget',
      'thinkingLevel',
      'thinkingLevel2',
      'thinkingLevel3',
      'thinkingLevel4',
      'urlContext',
    ]);
    return value.filter(
      (item): item is AiModelExtensionParameter =>
        typeof item === 'string' && allowed.has(item as AiModelExtensionParameter),
    );
  }

  private parseCapabilities(item: Record<string, unknown>): AiModelCapability[] {
    const explicit = item.capabilities ?? item.abilities;
    if (Array.isArray(explicit)) {
      return explicit.filter((value): value is AiModelCapability =>
        this.isCapability(value),
      );
    }

    if (explicit && typeof explicit === 'object') {
      return this.capabilitiesFromAbilityMap(explicit as Record<string, unknown>);
    }

    return this.capabilitiesFromAbilityMap(item);
  }

  private capabilitiesFromAbilityMap(values: Record<string, unknown>): AiModelCapability[] {
    const capabilityEntries: Array<[keyof typeof values, AiModelCapability]> = [
      ['chat', 'chat'],
      ['vision', 'vision'],
      ['functionCall', 'tool_use'],
      ['function_call', 'tool_use'],
      ['toolUse', 'tool_use'],
      ['tool_use', 'tool_use'],
      ['json', 'json'],
      ['structuredOutput', 'json'],
      ['structured_output', 'json'],
      ['audio', 'audio'],
      ['embedding', 'embedding'],
      ['files', 'files'],
      ['reasoning', 'reasoning'],
      ['fast', 'fast'],
      ['search', 'web_search'],
      ['webSearch', 'web_search'],
      ['web_search', 'web_search'],
      ['imageGeneration', 'image_generation'],
      ['image_generation', 'image_generation'],
      ['imageOutput', 'image_output'],
      ['image_output', 'image_output'],
      ['video', 'video'],
    ];
    const capabilities = new Set<AiModelCapability>();
    for (const [key, capability] of capabilityEntries) {
      if (values[key] === true) capabilities.add(capability);
    }
    return [...capabilities];
  }

  private isCapability(value: unknown): value is AiModelCapability {
    return (
      typeof value === 'string' &&
      [
        'chat',
        'vision',
        'tool_use',
        'json',
        'embedding',
        'reasoning',
        'fast',
        'web_search',
        'image_generation',
        'audio',
        'files',
        'image_output',
        'video',
      ].includes(value)
    );
  }
}
