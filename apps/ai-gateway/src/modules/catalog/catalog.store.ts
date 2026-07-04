import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiAssignmentUpdate,
  AiConfigUpdate,
  AiGatewayCatalog,
  AiModel,
  AiModelExtensionParameter,
  AiProviderRemoteModel,
  AiModelUpdate,
  AiModelType,
  AiProvider,
  AiProviderUpdate,
} from '@dicha/shared';
import { aiCatalogSeed, aiModelBank, aiProviderTemplateIds } from './catalog.seed';

const deprecatedSeedProviderIds = new Set(['vidorra']);
const deprecatedSeedModelIds = new Set([
  'deepseek:deepseek-chat',
  'deepseek:deepseek-reasoner',
]);

type PersistedCredential = {
  iv: string;
  tag: string;
  value: string;
};

type PersistedConfig = {
  providers: Array<AiProvider & { credential?: PersistedCredential }>;
  models: AiModel[];
  assignments: AiAssignmentUpdate[];
};

export type ProviderSecret = {
  provider: AiProvider;
  secret: string;
};

@Injectable()
export class CatalogStore {
  private readonly dataDir: string;
  private readonly encryptionKey: Buffer;

  constructor(config: ConfigService) {
    this.dataDir = config.get<string>('AI_GATEWAY_DATA_DIR', './data/ai-gateway');
    const secret = config.get<string>('AI_GATEWAY_SECRET_KEY') ?? this.developmentSecret(config);
    this.encryptionKey = createHash('sha256').update(secret).digest();
  }

  async getCatalog(ownerId: string): Promise<AiGatewayCatalog> {
    const persisted = await this.readConfig(ownerId);
    return {
      generatedAt: new Date().toISOString(),
      providers: persisted.providers.map(({ credential: _credential, ...provider }) => ({
        ...provider,
        credentialState: this.credentialState(provider.credentialState, _credential, provider),
      })),
      models: persisted.models,
      assignments: persisted.assignments,
    };
  }

  async updateConfig(ownerId: string, update: AiConfigUpdate): Promise<AiGatewayCatalog> {
    const current = await this.readConfig(ownerId);
    const providerPatches = update.providers ?? [];
    const modelPatches = update.models ?? [];
    const providerDeletes = new Set(
      providerPatches
        .filter((patch) => patch.delete)
        .map((patch) => patch.providerId),
    );
    const modelDeletes = new Set(
      modelPatches
        .filter((patch) => patch.delete)
        .map((patch) => patch.modelId),
    );

    const providers = current.providers
      .filter((provider) => !providerDeletes.has(provider.id))
      .map((provider) => {
        const patch = providerPatches.find((item) => item.providerId === provider.id && !item.delete);
        if (!patch) return provider;
        const credential = patch.credential ? this.encrypt(patch.credential) : provider.credential;
        const enabled =
          patch.enabled ?? (provider.status === 'enabled' || provider.status === 'needs_config');
        const status = this.providerStatus(provider, enabled, credential);
        return {
          ...provider,
          avatar: patch.avatar ?? provider.avatar,
          baseUrl: patch.baseUrl ?? provider.baseUrl,
          requestFormat: patch.requestFormat ?? provider.requestFormat,
          status,
          credential,
          credentialState: this.credentialState(provider.credentialState, credential, provider),
        } satisfies PersistedConfig['providers'][number];
      });
    const providerAdditions = providerPatches
      .filter((patch) => !patch.delete)
      .filter((patch) => !current.providers.some((provider) => provider.id === patch.providerId))
      .filter((patch) => this.isProviderCreate(patch))
      .map((patch, index) => this.createProvider(patch, providers.length + index + 1));
    const nextProviders = [...providers, ...providerAdditions];

    const models = current.models
      .filter((model) => !providerDeletes.has(model.providerId))
      .filter((model) => !modelDeletes.has(model.id))
      .map((model) => {
        const patch = modelPatches.find((item) => item.modelId === model.id && !item.delete);
        return patch
          ? {
              ...model,
              enabled: patch.enabled ?? model.enabled,
              displayName: patch.displayName ?? model.displayName,
              avatar: patch.avatar ?? model.avatar,
              contextWindow: patch.contextWindow ?? model.contextWindow,
              modelType: patch.modelType ?? model.modelType,
              extensionParameters: patch.extensionParameters ?? model.extensionParameters,
              capabilities: patch.capabilities ?? model.capabilities,
            }
          : model;
      });
    const knownProviderIds = new Set(nextProviders.map((provider) => provider.id));
    const modelAdditions = modelPatches
      .filter((patch) => !patch.delete)
      .filter((patch) => !current.models.some((model) => model.id === patch.modelId))
      .filter((patch) => this.isModelCreate(patch))
      .map((patch) => {
        if (!knownProviderIds.has(patch.providerId)) {
          throw new BadRequestException(`Unknown AI provider: ${patch.providerId}`);
        }
        return this.createModel(patch);
      });

    const assignments = this.mergeAssignments(current.assignments, update.assignments ?? []);
    const modelIds = new Set([...models, ...modelAdditions].map((model) => model.id));
    await this.writeConfig(ownerId, {
      providers: nextProviders,
      models: [...models, ...modelAdditions],
      assignments: assignments
        .map((assignment) => ({
          ...assignment,
          fallbackModelIds: assignment.fallbackModelIds.filter((modelId) => modelIds.has(modelId)),
        }))
        .filter((assignment) => modelIds.has(assignment.primaryModelId)),
    });
    return this.getCatalog(ownerId);
  }

  async getProvider(ownerId: string, providerId: string): Promise<AiProvider | null> {
    const current = await this.readConfig(ownerId);
    const provider = current.providers.find((item) => item.id === providerId);
    if (!provider) return null;
    const { credential: _credential, ...publicProvider } = provider;
    return {
      ...publicProvider,
      credentialState: this.credentialState(publicProvider.credentialState, _credential, publicProvider),
    };
  }

  async getProviderSecret(ownerId: string, providerId: string): Promise<ProviderSecret | null> {
    const current = await this.readConfig(ownerId);
    const provider = current.providers.find((item) => item.id === providerId);
    if (!provider) return null;
    if (!provider.credential && provider.credentialMode !== 'not_required') return null;
    const { credential: _credential, ...publicProvider } = provider;
    return {
      provider: {
        ...publicProvider,
        credentialState: this.credentialState(publicProvider.credentialState, _credential, publicProvider),
      },
      secret: provider.credential ? this.decrypt(provider.credential) : '',
    };
  }

  async mergeSyncedModels(
    ownerId: string,
    providerId: string,
    syncedModels: AiProviderRemoteModel[],
  ): Promise<AiGatewayCatalog> {
    const current = await this.readConfig(ownerId);
    const syncedByName = new Map(syncedModels.map((model) => [model.id, model]));
    const knownModelNames = new Set(
      current.models.filter((model) => model.providerId === providerId).map((model) => model.name),
    );
    const additions = syncedModels
      .filter((model) => !knownModelNames.has(model.id))
      .map((model) => this.syncedModel(providerId, model))
      .filter((model): model is AiModel => Boolean(model));

    const models = current.models.map((model) =>
      model.providerId === providerId && syncedByName.has(model.name)
        ? this.mergeSyncedModelMetadata(model, syncedByName.get(model.name)!)
        : model,
    );

    await this.writeConfig(ownerId, { ...current, models: [...models, ...additions] });
    return this.getCatalog(ownerId);
  }

  private async readConfig(ownerId: string): Promise<PersistedConfig> {
    try {
      const raw = await readFile(this.configPath(ownerId), 'utf8');
      return this.normalizeConfig(JSON.parse(raw) as PersistedConfig);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const seeded = this.seedConfig();
      await this.writeConfig(ownerId, seeded);
      return seeded;
    }
  }

  private seedConfig(): PersistedConfig {
    return {
      providers: aiCatalogSeed.providers.map((provider) => this.seedProvider(provider)),
      models: aiCatalogSeed.models.map((model) => this.seedModel(model)),
      assignments: aiCatalogSeed.assignments,
    };
  }

  private normalizeConfig(config: PersistedConfig): PersistedConfig {
    const legacySeedProviderIds = new Set(
      config.providers
        .filter((provider) => this.isLegacySeedProvider(provider))
        .map((provider) => provider.id),
    );
    const legacySeedModelIds = new Set(
      config.models
        .filter((model) => legacySeedProviderIds.has(model.providerId) && !model.custom)
        .map((model) => model.id),
    );
    const normalizedProviders = config.providers
      .filter((provider) => !legacySeedProviderIds.has(provider.id))
      .map((provider) => this.normalizeProvider(provider));
    const providerIds = new Set(normalizedProviders.map((provider) => provider.id));
    const seededProviders = aiCatalogSeed.providers
      .filter((provider) => !providerIds.has(provider.id))
      .map((provider) => this.seedProvider(provider));
    const providers = [...normalizedProviders, ...seededProviders].sort(
      (left, right) => left.priority - right.priority,
    );
    const knownProviderIds = new Set(providers.map((provider) => provider.id));

    const normalizedModels = config.models
      .filter((model) => !legacySeedModelIds.has(model.id))
      .filter((model) => model.custom || !deprecatedSeedModelIds.has(model.id))
      .filter((model) => knownProviderIds.has(model.providerId))
      .map((model) => this.normalizeModel(model));
    const normalizedModelIds = new Set(normalizedModels.map((model) => model.id));
    const seededModels = aiCatalogSeed.models
      .filter((model) => !normalizedModelIds.has(model.id))
      .filter((model) => knownProviderIds.has(model.providerId))
      .map((model) => this.seedModel(model));
    const models = [...normalizedModels, ...seededModels];
    const modelIds = new Set(models.map((model) => model.id));
    const normalizedAssignments = config.assignments
      .map((assignment) => ({
        ...assignment,
        fallbackModelIds: assignment.fallbackModelIds.filter((modelId) => modelIds.has(modelId)),
      }))
      .filter((assignment) => modelIds.has(assignment.primaryModelId));
    const assignmentUseCases = new Set(
      normalizedAssignments.map((assignment) => assignment.useCase),
    );
    const seededAssignments = aiCatalogSeed.assignments
      .filter((assignment) => !assignmentUseCases.has(assignment.useCase))
      .filter((assignment) => modelIds.has(assignment.primaryModelId))
      .map((assignment) => ({
        ...assignment,
        fallbackModelIds: assignment.fallbackModelIds.filter((modelId) => modelIds.has(modelId)),
      }));

    return {
      ...config,
      providers,
      models,
      assignments: normalizedAssignments.concat(seededAssignments),
    };
  }

  private seedProvider(provider: AiProvider): PersistedConfig['providers'][number] {
    return {
      ...provider,
      credentialState: this.credentialState(provider.credentialState, undefined, provider),
      status:
        provider.status === 'enabled' ? this.providerStatus(provider, true, undefined) : provider.status,
    };
  }

  private seedModel(model: AiModel): AiModel {
    return {
      ...model,
      enabled: model.enabled && model.availability !== 'config_required',
      availability: model.availability === 'healthy' ? 'config_required' : model.availability,
    };
  }

  private isLegacySeedProvider(provider: PersistedConfig['providers'][number]): boolean {
    return (
      (aiProviderTemplateIds.includes(provider.id) || deprecatedSeedProviderIds.has(provider.id)) &&
      provider.custom === undefined &&
      !provider.credential
    );
  }

  private normalizeProvider(
    provider: PersistedConfig['providers'][number],
  ): PersistedConfig['providers'][number] {
    const seed = provider.custom ? undefined : aiCatalogSeed.providers.find((item) => item.id === provider.id);
    const legacyProvider = provider as PersistedConfig['providers'][number] & {
      avatar?: string;
      billingMode?: AiProvider['billingMode'];
      category?: AiProvider['category'];
      credentialMode?: AiProvider['credentialMode'];
      modelSyncMode?: AiProvider['modelSyncMode'];
    };
    const normalizedProviderBase = {
      ...provider,
      avatar: legacyProvider.avatar ?? provider.shortName,
      billingMode: legacyProvider.billingMode ?? 'user_provider',
      category: legacyProvider.category ?? 'global',
      credentialMode: legacyProvider.credentialMode ?? 'user_api_key',
      modelSyncMode: legacyProvider.modelSyncMode ?? 'openai_models_endpoint',
    } satisfies PersistedConfig['providers'][number];
    const normalizedProvider = seed
      ? ({
          ...normalizedProviderBase,
          name: seed.name,
          shortName: seed.shortName,
          description: seed.description,
          baseUrl: this.refreshSeedBaseUrl(normalizedProviderBase.baseUrl, seed.baseUrl),
          category: seed.category,
          authType: seed.authType,
          requestFormat: seed.requestFormat,
          credentialMode: seed.credentialMode,
          billingMode: seed.billingMode,
          modelSyncMode: seed.modelSyncMode,
          priority: seed.priority,
          custom: seed.custom,
        } satisfies PersistedConfig['providers'][number])
      : normalizedProviderBase;
    return {
      ...normalizedProvider,
      credentialState: this.credentialState(
        normalizedProvider.credentialState,
        normalizedProvider.credential,
        normalizedProvider,
      ),
    };
  }

  private refreshSeedBaseUrl(currentBaseUrl: string, seedBaseUrl: string): string {
    const current = currentBaseUrl.replace(/\/+$/, '');
    const seed = seedBaseUrl.replace(/\/+$/, '');
    if (current === seed) return current;
    if (seed.startsWith(`${current}/`)) return seed;
    return currentBaseUrl;
  }

  private normalizeModel(model: AiModel): AiModel {
    const legacyModel = model as AiModel & {
      avatar?: string;
      catalogSource?: AiModel['catalogSource'];
      modelType?: AiModelType;
      extensionParameters?: AiModelExtensionParameter[];
    };
    const seed = model.custom ? undefined : aiModelBank.find((item) => item.id === model.id);
    if (seed) {
      return {
        ...seed,
        enabled: model.enabled,
        availability: model.availability,
        lastLatencyMs: model.lastLatencyMs,
        custom: model.custom ?? seed.custom,
      };
    }
    return {
      ...model,
      avatar: legacyModel.avatar ?? this.modelAvatar(model.displayName || model.name),
      catalogSource: legacyModel.catalogSource ?? (model.custom ? 'custom' : 'static_model_bank'),
      modelType: legacyModel.modelType ?? 'chat',
      extensionParameters: legacyModel.extensionParameters ?? [],
    };
  }

  private isProviderCreate(patch: AiProviderUpdate): patch is AiProviderUpdate & {
    name: string;
    shortName: string;
    description: string;
    baseUrl: string;
  } {
    return 'name' in patch && 'shortName' in patch && 'description' in patch && 'baseUrl' in patch;
  }

  private createProvider(
    patch: AiProviderUpdate & {
      name: string;
      shortName: string;
      description: string;
      baseUrl: string;
      authType?: AiProvider['authType'];
      billingMode?: AiProvider['billingMode'];
      category?: AiProvider['category'];
      credentialMode?: AiProvider['credentialMode'];
      modelSyncMode?: AiProvider['modelSyncMode'];
      custom?: boolean;
    },
    priority: number,
  ): PersistedConfig['providers'][number] {
    const credential = patch.credential ? this.encrypt(patch.credential) : undefined;
    const enabled = patch.enabled ?? true;
    const providerBase: AiProvider = {
      id: patch.providerId,
      name: patch.name,
      shortName: patch.shortName,
      avatar: patch.avatar ?? patch.shortName,
      description: patch.description,
      baseUrl: patch.baseUrl,
      status: 'disabled',
      category: patch.category ?? 'global',
      authType: patch.authType ?? 'api_key',
      requestFormat: patch.requestFormat ?? 'openai_compatible',
      credentialMode: patch.credentialMode ?? 'user_api_key',
      billingMode: patch.billingMode ?? 'user_provider',
      modelSyncMode: patch.modelSyncMode ?? 'openai_models_endpoint',
      credentialState: credential ? 'masked' : 'missing',
      priority,
      custom: patch.custom ?? true,
    };
    return {
      ...providerBase,
      status: this.providerStatus(providerBase, enabled, credential),
      credentialState: this.credentialState(providerBase.credentialState, credential, providerBase),
      credential,
    };
  }

  private isModelCreate(patch: AiModelUpdate): patch is AiModelUpdate & {
    providerId: string;
    name: string;
    displayName: string;
    contextWindow: number;
    modelType: AiModelType;
    extensionParameters: AiModelExtensionParameter[];
    capabilities: AiModel['capabilities'];
  } {
    return (
      'providerId' in patch &&
      'name' in patch &&
      'displayName' in patch &&
      'contextWindow' in patch &&
      'modelType' in patch &&
      'extensionParameters' in patch &&
      'capabilities' in patch
    );
  }

  private createModel(
    patch: AiModelUpdate & {
      providerId: string;
      name: string;
      displayName: string;
      contextWindow: number;
      modelType: AiModelType;
      extensionParameters: AiModelExtensionParameter[];
      capabilities: AiModel['capabilities'];
    },
  ): AiModel {
    return {
      id: patch.modelId,
      providerId: patch.providerId,
      name: patch.name,
      displayName: patch.displayName,
      avatar: patch.avatar ?? this.modelAvatar(patch.displayName || patch.name),
      contextWindow: patch.contextWindow,
      modelType: patch.modelType,
      extensionParameters: patch.extensionParameters,
      capabilities: patch.capabilities,
      enabled: patch.enabled ?? false,
      recommended: false,
      availability: 'unknown',
      lastLatencyMs: null,
      priceHint: '自定义模型',
      catalogSource: 'custom',
      custom: true,
    };
  }

  private async writeConfig(ownerId: string, config: PersistedConfig): Promise<void> {
    const configPath = this.configPath(ownerId);
    await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
    await chmod(dirname(configPath), 0o700);
    const nextPath = `${configPath}.tmp`;
    await writeFile(nextPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(nextPath, configPath);
    await chmod(configPath, 0o600);
  }

  private configPath(ownerId: string): string {
    const ownerKey = createHash('sha256').update(ownerId).digest('hex').slice(0, 32);
    return join(this.dataDir, 'users', `${ownerKey}.json`);
  }

  private developmentSecret(config: ConfigService): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AI_GATEWAY_SECRET_KEY is required in production');
    }
    return config.get<string>('AI_GATEWAY_INTERNAL_TOKEN') ?? 'dicha-ai-gateway-local-dev-secret';
  }

  private mergeAssignments(
    current: AiAssignmentUpdate[],
    updates: AiAssignmentUpdate[],
  ): AiAssignmentUpdate[] {
    if (updates.length === 0) return current;
    return current.map((assignment) => {
      const patch = updates.find((item) => item.useCase === assignment.useCase);
      return patch ?? assignment;
    });
  }

  private encrypt(value: string): PersistedCredential {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      value: encrypted.toString('base64'),
    };
  }

  private decrypt(credential: PersistedCredential): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(credential.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(credential.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(credential.value, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private providerStatus(
    provider: AiProvider,
    enabled: boolean,
    credential: PersistedCredential | undefined,
  ): AiProvider['status'] {
    if (!enabled) return 'disabled';
    if (provider.credentialMode === 'platform_managed') return 'enabled';
    if (provider.credentialMode === 'not_required') return 'enabled';
    return credential ? 'enabled' : 'needs_config';
  }

  private credentialState(
    current: AiProvider['credentialState'],
    credential: PersistedCredential | undefined,
    provider: Pick<AiProvider, 'credentialMode'>,
  ): AiProvider['credentialState'] {
    if (provider.credentialMode === 'platform_managed') return 'platform_managed';
    if (provider.credentialMode === 'not_required') return 'not_required';
    if (!credential) return 'missing';
    this.decrypt(credential);
    return current === 'configured' ? 'configured' : 'masked';
  }

  private mergeSyncedModelMetadata(model: AiModel, remoteModel: AiProviderRemoteModel): AiModel {
    const metadata = this.modelBankMetadata(model.providerId, remoteModel);
    return {
      ...model,
      displayName: remoteModel.displayName ?? metadata?.displayName ?? model.displayName,
      avatar: metadata?.avatar ?? model.avatar,
      contextWindow: remoteModel.contextWindow ?? metadata?.contextWindow ?? model.contextWindow,
      modelType: remoteModel.modelType ?? metadata?.modelType ?? model.modelType,
      extensionParameters:
        remoteModel.extensionParameters ??
        metadata?.extensionParameters ??
        model.extensionParameters,
      capabilities: remoteModel.capabilities ?? metadata?.capabilities ?? model.capabilities,
      maxOutput: remoteModel.maxOutput ?? metadata?.maxOutput ?? model.maxOutput,
      priceHint: remoteModel.priceHint ?? metadata?.priceHint ?? model.priceHint,
      pricing: remoteModel.pricing ?? metadata?.pricing ?? model.pricing,
      releasedAt: remoteModel.releasedAt ?? metadata?.releasedAt ?? model.releasedAt,
      recommended: metadata?.recommended ?? model.recommended,
      availability: model.enabled ? 'healthy' : model.availability,
      catalogSource: model.catalogSource === 'custom' ? 'custom' : 'upstream_sync',
    };
  }

  private syncedModel(providerId: string, remoteModel: AiProviderRemoteModel): AiModel | null {
    const metadata = this.modelBankMetadata(providerId, remoteModel);
    const contextWindow = remoteModel.contextWindow ?? metadata?.contextWindow;
    const modelType = remoteModel.modelType ?? metadata?.modelType;
    const capabilities = remoteModel.capabilities ?? metadata?.capabilities ?? [];

    return {
      id: `${providerId}:${remoteModel.id}`,
      providerId,
      name: remoteModel.id,
      displayName: remoteModel.displayName ?? metadata?.displayName ?? remoteModel.id,
      avatar: metadata?.avatar ?? this.modelAvatar(remoteModel.displayName ?? remoteModel.id),
      contextWindow: contextWindow ?? null,
      modelType: modelType ?? this.modelTypeFromCapabilities(capabilities),
      extensionParameters: remoteModel.extensionParameters ?? metadata?.extensionParameters ?? [],
      capabilities,
      maxOutput: remoteModel.maxOutput ?? metadata?.maxOutput,
      enabled: false,
      recommended: metadata?.recommended ?? false,
      availability: 'unknown',
      lastLatencyMs: null,
      priceHint: remoteModel.priceHint ?? metadata?.priceHint ?? '同步自供应商，模型元数据待补充',
      pricing: remoteModel.pricing ?? metadata?.pricing,
      releasedAt: remoteModel.releasedAt ?? metadata?.releasedAt,
      catalogSource: 'upstream_sync',
    };
  }

  private modelBankMetadata(
    providerId: string,
    remoteModel: AiProviderRemoteModel,
  ): AiModel | undefined {
    return aiModelBank.find(
      (model) => model.providerId === providerId && model.name === remoteModel.id,
    );
  }

  private modelTypeFromCapabilities(capabilities: AiModel['capabilities']): AiModelType {
    if (capabilities.includes('embedding')) return 'embedding';
    if (capabilities.includes('image_generation')) return 'image';
    if (capabilities.includes('video')) return 'video';
    return 'chat';
  }

  private modelAvatar(value: string): string {
    return value
      .trim()
      .split(/[-_\\s:/.]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'AI';
  }
}
