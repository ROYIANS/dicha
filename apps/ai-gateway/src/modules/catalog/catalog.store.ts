import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
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
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { aiCatalogSeed, aiModelBank, aiProviderTemplateIds } from './catalog.seed';

const deprecatedSeedProviderIds = new Set(['vidorra']);
const deprecatedSeedModelIds = new Set([
  'dicha:assistant',
  'deepseek:deepseek-chat',
  'deepseek:deepseek-reasoner',
]);
const DICHA_PROVIDER_ID = 'dicha';

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

type AiProviderConfigRecord = Prisma.AiProviderConfigGetPayload<Record<string, never>>;
type AiModelConfigRecord = Prisma.AiModelConfigGetPayload<Record<string, never>>;
type AiModelAssignmentConfigRecord = Prisma.AiModelAssignmentConfigGetPayload<
  Record<string, never>
>;
type AiProviderDirectorySettingRecord = Prisma.AiProviderDirectorySettingGetPayload<
  Record<string, never>
>;
type AiProviderDirectoryModelRecord = Prisma.AiProviderDirectoryModelGetPayload<
  Record<string, never>
>;
type AiInternalProviderModelRecord = Prisma.AiInternalProviderModelGetPayload<{
  include: { internalProvider: true };
}>;

export type ProviderSecret = {
  provider: AiProvider;
  secret: string;
};

export type SystemProviderChannel = {
  id: string;
  internalProviderId?: string;
  providerId: string;
  modelId: string;
  name: string;
  upstreamBaseUrl: string;
  upstreamModelName: string;
  requestFormat: AiProvider['requestFormat'];
  authType: AiProvider['authType'];
  secret: string;
  parameterConfig?: Record<string, unknown>;
};

@Injectable()
export class CatalogStore {
  private readonly encryptionKey: Buffer;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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
      providerPatches.filter((patch) => patch.delete).map((patch) => patch.providerId),
    );
    const modelDeletes = new Set(
      modelPatches.filter((patch) => patch.delete).map((patch) => patch.modelId),
    );
    const currentProvidersById = new Map(
      current.providers.map((provider) => [provider.id, provider] as const),
    );
    for (const providerId of providerDeletes) {
      const provider = currentProvidersById.get(providerId);
      if (provider && provider.custom !== true) {
        throw new BadRequestException('Only custom AI providers can be deleted');
      }
    }
    for (const modelId of modelDeletes) {
      const model = current.models.find((item) => item.id === modelId);
      if (model && !this.isUserOwnedModel(model, currentProvidersById)) {
        throw new BadRequestException('Only user-owned AI models can be deleted');
      }
    }

    const providers = current.providers
      .filter((provider) => !providerDeletes.has(provider.id))
      .map((provider) => {
        const patch = providerPatches.find(
          (item) => item.providerId === provider.id && !item.delete,
        );
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
              parameterConfig:
                patch.parameterConfig === null
                  ? undefined
                  : (patch.parameterConfig ?? model.parameterConfig),
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
      credentialState: this.credentialState(
        publicProvider.credentialState,
        _credential,
        publicProvider,
      ),
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
        credentialState: this.credentialState(
          publicProvider.credentialState,
          _credential,
          publicProvider,
        ),
      },
      secret: provider.credential ? this.decrypt(provider.credential) : '',
    };
  }

  async getSystemProviderChannel(
    providerId: string,
    modelId: string,
  ): Promise<SystemProviderChannel | null> {
    return (await this.getSystemProviderChannels(providerId, modelId))[0] ?? null;
  }

  async getSystemProviderChannels(
    providerId: string,
    modelId: string,
  ): Promise<SystemProviderChannel[]> {
    const channels: SystemProviderChannel[] = [];
    if (providerId === DICHA_PROVIDER_ID) {
      const internalModels = await this.prisma.aiInternalProviderModel.findMany({
        where: {
          enabled: true,
          dxModelId: modelId,
          internalProvider: { enabled: true },
        },
        include: { internalProvider: true },
        orderBy: [
          { dxSortOrder: 'asc' },
          { internalProvider: { priority: 'asc' } },
          { updatedAt: 'desc' },
        ],
      });
      channels.push(
        ...internalModels.map((internalModel) => ({
          id: internalModel.id,
          internalProviderId: internalModel.internalProviderId,
          providerId,
          modelId,
          name: internalModel.dxDisplayName ?? internalModel.upstreamDisplayName,
          upstreamBaseUrl: internalModel.internalProvider.baseUrl,
          upstreamModelName: internalModel.upstreamModelName,
          requestFormat: internalModel.internalProvider
            .requestFormat as AiProvider['requestFormat'],
          authType: internalModel.internalProvider.authType as AiProvider['authType'],
          secret: internalModel.internalProvider.credential
            ? this.decrypt(internalModel.internalProvider.credential as PersistedCredential)
            : '',
          parameterConfig: this.recordFromJson(internalModel.parameterConfig),
        })),
      );
    }

    const legacyChannels = await this.prisma.aiSystemProviderChannel.findMany({
      where: { providerId, modelId, enabled: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    channels.push(
      ...legacyChannels.map((channel) => ({
        id: channel.id,
        providerId: channel.providerId,
        modelId: channel.modelId,
        name: channel.name,
        upstreamBaseUrl: channel.upstreamBaseUrl,
        upstreamModelName: channel.upstreamModelName,
        requestFormat: channel.requestFormat as AiProvider['requestFormat'],
        authType: channel.authType as AiProvider['authType'],
        secret: channel.credential ? this.decrypt(channel.credential as PersistedCredential) : '',
      })),
    );
    return channels;
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
    const [
      providers,
      models,
      assignments,
      directorySettings,
      directoryModels,
      internalDichaModels,
    ] = await Promise.all([
      this.prisma.aiProviderConfig.findMany({
        where: { ownerId },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.aiModelConfig.findMany({
        where: { ownerId },
        orderBy: [{ providerId: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.aiModelAssignmentConfig.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.aiProviderDirectorySetting.findMany(),
      this.prisma.aiProviderDirectoryModel.findMany({
        where: { enabled: true },
        orderBy: [{ providerId: 'asc' }, { displayName: 'asc' }],
      }),
      this.prisma.aiInternalProviderModel.findMany({
        where: { enabled: true, internalProvider: { enabled: true } },
        include: { internalProvider: true },
        orderBy: [{ dxSortOrder: 'asc' }, { updatedAt: 'desc' }],
      }),
    ]);

    const settingsByProvider = new Map(
      directorySettings.map((setting) => [setting.providerId, setting]),
    );
    const enabledDirectoryProviderIds = new Set(
      directorySettings.filter((setting) => setting.enabled).map((setting) => setting.providerId),
    );
    const modelSeed = this.visibleModelSeed(
      enabledDirectoryProviderIds,
      directoryModels,
      internalDichaModels,
    );
    if (providers.length === 0) {
      const seeded = this.seedConfig(enabledDirectoryProviderIds, settingsByProvider, modelSeed);
      await this.writeConfig(ownerId, seeded);
      return seeded;
    }

    const current = this.normalizeConfig(
      {
        providers: providers.map((provider) => this.providerFromRecord(provider)),
        models: models.map((model) => this.modelFromRecord(model)),
        assignments: assignments.map((assignment) => this.assignmentFromRecord(assignment)),
      },
      enabledDirectoryProviderIds,
      settingsByProvider,
      modelSeed,
    );
    return current;
  }

  private seedConfig(
    enabledDirectoryProviderIds: Set<string>,
    settingsByProvider: Map<string, AiProviderDirectorySettingRecord>,
    modelSeed: AiModel[],
  ): PersistedConfig {
    const providers = aiCatalogSeed.providers.filter((provider) =>
      this.isProviderDirectoryVisible(provider, enabledDirectoryProviderIds),
    );
    const providerIds = new Set(providers.map((provider) => provider.id));
    const models = modelSeed.filter((model) => providerIds.has(model.providerId));
    const modelIds = new Set(models.map((model) => model.id));

    return {
      providers: providers.map((provider) =>
        this.seedProvider(provider, settingsByProvider.get(provider.id)),
      ),
      models: models.map((model) => this.seedModel(model)),
      assignments: aiCatalogSeed.assignments
        .filter((assignment) => modelIds.has(assignment.primaryModelId))
        .map((assignment) => ({
          ...assignment,
          fallbackModelIds: assignment.fallbackModelIds.filter((modelId) => modelIds.has(modelId)),
        })),
    };
  }

  private normalizeConfig(
    config: PersistedConfig,
    enabledDirectoryProviderIds: Set<string>,
    settingsByProvider: Map<string, AiProviderDirectorySettingRecord>,
    modelSeed: AiModel[],
  ): PersistedConfig {
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
      .filter((provider) => this.isProviderDirectoryVisible(provider, enabledDirectoryProviderIds))
      .map((provider) => this.normalizeProvider(provider, settingsByProvider.get(provider.id)));
    const providerIds = new Set(normalizedProviders.map((provider) => provider.id));
    const seededProviders = aiCatalogSeed.providers
      .filter((provider) => !providerIds.has(provider.id))
      .filter((provider) => this.isProviderDirectoryVisible(provider, enabledDirectoryProviderIds))
      .map((provider) => this.seedProvider(provider, settingsByProvider.get(provider.id)));
    const providers = [...normalizedProviders, ...seededProviders].sort(
      (left, right) => left.priority - right.priority,
    );
    const knownProviderIds = new Set(providers.map((provider) => provider.id));
    const providersById = new Map(providers.map((provider) => [provider.id, provider] as const));
    const modelSeedById = new Map(modelSeed.map((model) => [model.id, model]));

    const normalizedModels = config.models
      .filter((model) => !legacySeedModelIds.has(model.id))
      .filter((model) => model.custom || !deprecatedSeedModelIds.has(model.id))
      .filter((model) => knownProviderIds.has(model.providerId))
      .filter((model) => this.isUserOwnedModel(model, providersById) || modelSeedById.has(model.id))
      .map((model) => this.normalizeModel(model, modelSeedById.get(model.id)));
    const normalizedModelIds = new Set(normalizedModels.map((model) => model.id));
    const seededModels = modelSeed
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

  private visibleModelSeed(
    enabledDirectoryProviderIds: Set<string>,
    directoryModels: AiProviderDirectoryModelRecord[],
    internalDichaModels: AiInternalProviderModelRecord[],
  ): AiModel[] {
    const directoryProvidersWithModels = new Set(directoryModels.map((model) => model.providerId));
    const builtInModels = aiCatalogSeed.models.filter((model) => {
      if (model.providerId === DICHA_PROVIDER_ID) return true;
      if (!enabledDirectoryProviderIds.has(model.providerId)) return false;
      return !directoryProvidersWithModels.has(model.providerId);
    });
    const syncedDirectoryModels = directoryModels.map((model) =>
      this.modelFromDirectoryModelRecord(model),
    );
    const dichaModels = internalDichaModels.map((model) =>
      this.modelFromInternalModelRecord(model),
    );
    const byId = new Map<string, AiModel>();
    for (const model of [...builtInModels, ...syncedDirectoryModels, ...dichaModels]) {
      byId.set(model.id, model);
    }
    return [...byId.values()];
  }

  private modelFromDirectoryModelRecord(record: AiProviderDirectoryModelRecord): AiModel {
    return {
      id: record.modelId,
      providerId: record.providerId,
      name: record.name,
      displayName: record.displayName,
      avatar: record.avatar ?? undefined,
      contextWindow: record.contextWindow,
      modelType: record.modelType as AiModelType,
      extensionParameters: this.arrayFromJson<AiModelExtensionParameter>(
        record.extensionParameters,
      ),
      capabilities: this.arrayFromJson<AiModel['capabilities'][number]>(record.capabilities),
      maxOutput: record.maxOutput ?? undefined,
      enabled: record.enabled,
      recommended: record.recommended,
      availability: record.availability as AiModel['availability'],
      lastLatencyMs: null,
      priceHint: record.priceHint,
      catalogSource: (record.catalogSource ?? 'upstream_sync') as AiModel['catalogSource'],
      pricing: this.optionalJson<AiModel['pricing']>(record.pricing),
      releasedAt: record.releasedAt ?? undefined,
      lobeMetadata: this.optionalJson<AiModel['lobeMetadata']>(record.lobeMetadata),
      defaultParameterConfig: this.recordFromJson(record.parameterConfig),
    };
  }

  private modelFromInternalModelRecord(record: AiInternalProviderModelRecord): AiModel {
    const displayName = record.dxDisplayName ?? record.upstreamDisplayName;
    const modelId = record.dxModelId ?? `dicha:${record.upstreamModelName}`;
    return {
      id: modelId,
      providerId: DICHA_PROVIDER_ID,
      name: modelId.replace(/^dicha:/, ''),
      displayName,
      avatar: this.modelAvatar(displayName),
      contextWindow: record.contextWindow,
      modelType: record.modelType as AiModelType,
      extensionParameters: [],
      capabilities: this.arrayFromJson<AiModel['capabilities'][number]>(record.capabilities),
      maxOutput: record.maxOutput ?? undefined,
      enabled: record.enabled,
      recommended: record.dxRecommended,
      availability: record.availability as AiModel['availability'],
      lastLatencyMs: null,
      priceHint: record.dxPriceHint ?? 'Dicha AI 模型',
      catalogSource: 'dicha_catalog',
      pricing: this.optionalJson<AiModel['pricing']>(record.dxPricing),
      releasedAt: record.releasedAt ?? undefined,
      defaultParameterConfig: this.recordFromJson(record.parameterConfig),
    };
  }

  private isProviderDirectoryVisible(
    provider: Pick<AiProvider, 'id' | 'custom'>,
    enabledDirectoryProviderIds: Set<string>,
  ): boolean {
    return (
      provider.custom === true ||
      provider.id === DICHA_PROVIDER_ID ||
      enabledDirectoryProviderIds.has(provider.id)
    );
  }

  private seedProvider(
    provider: AiProvider,
    setting?: AiProviderDirectorySettingRecord,
  ): PersistedConfig['providers'][number] {
    const providerWithSetting = this.applyDirectorySetting(provider, setting);
    return {
      ...providerWithSetting,
      credentialState: this.credentialState(
        providerWithSetting.credentialState,
        undefined,
        providerWithSetting,
      ),
      status:
        providerWithSetting.status === 'enabled'
          ? this.providerStatus(providerWithSetting, true, undefined)
          : providerWithSetting.status,
    };
  }

  private seedModel(model: AiModel): AiModel {
    if (model.catalogSource === 'dicha_catalog') {
      return model;
    }
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
    setting?: AiProviderDirectorySettingRecord,
  ): PersistedConfig['providers'][number] {
    const seed = provider.custom
      ? undefined
      : aiCatalogSeed.providers.find((item) => item.id === provider.id);
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
    const withSetting = this.applyDirectorySetting(normalizedProvider, setting);
    return {
      ...normalizedProvider,
      ...withSetting,
      credential: normalizedProvider.credential,
      credentialState: this.credentialState(
        normalizedProvider.credentialState,
        normalizedProvider.credential,
        withSetting,
      ),
    };
  }

  private applyDirectorySetting<T extends AiProvider>(
    provider: T,
    setting?: AiProviderDirectorySettingRecord,
  ): T {
    if (!setting || provider.custom || provider.id === DICHA_PROVIDER_ID) return provider;
    return {
      ...provider,
      baseUrl: setting.baseUrl ?? provider.baseUrl,
      requestFormat: (setting.requestFormat ?? provider.requestFormat) as T['requestFormat'],
      authType: (setting.authType ?? provider.authType) as T['authType'],
      modelSyncMode: (setting.modelSyncMode ?? provider.modelSyncMode) as T['modelSyncMode'],
    };
  }

  private refreshSeedBaseUrl(currentBaseUrl: string, seedBaseUrl: string): string {
    const current = currentBaseUrl.replace(/\/+$/, '');
    const seed = seedBaseUrl.replace(/\/+$/, '');
    if (current === seed) return current;
    if (seed.startsWith(`${current}/`)) return seed;
    return currentBaseUrl;
  }

  private normalizeModel(model: AiModel, modelSeed?: AiModel): AiModel {
    const legacyModel = model as AiModel & {
      avatar?: string;
      catalogSource?: AiModel['catalogSource'];
      modelType?: AiModelType;
      extensionParameters?: AiModelExtensionParameter[];
    };
    const seed = model.custom
      ? undefined
      : (modelSeed ?? aiModelBank.find((item) => item.id === model.id));
    if (seed) {
      const platformOwnedModel =
        seed.providerId === DICHA_PROVIDER_ID || seed.catalogSource === 'dicha_catalog';
      return {
        ...seed,
        enabled: platformOwnedModel ? seed.enabled : model.enabled,
        availability: platformOwnedModel ? seed.availability : model.availability,
        lastLatencyMs: model.lastLatencyMs,
        parameterConfig: model.parameterConfig,
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

  private isUserOwnedModel(
    model: AiModel,
    providersById: ReadonlyMap<string, PersistedConfig['providers'][number]>,
  ): boolean {
    return model.custom === true || providersById.get(model.providerId)?.custom === true;
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
      parameterConfig: patch.parameterConfig ?? undefined,
      custom: true,
    };
  }

  private async writeConfig(ownerId: string, config: PersistedConfig): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.aiModelAssignmentConfig.deleteMany({ where: { ownerId } }),
      this.prisma.aiModelConfig.deleteMany({ where: { ownerId } }),
      this.prisma.aiProviderConfig.deleteMany({ where: { ownerId } }),
      this.prisma.aiProviderConfig.createMany({
        data: config.providers.map((provider) => this.providerCreateInput(ownerId, provider)),
      }),
      this.prisma.aiModelConfig.createMany({
        data: config.models.map((model) => this.modelCreateInput(ownerId, model)),
      }),
      this.prisma.aiModelAssignmentConfig.createMany({
        data: config.assignments.map((assignment) =>
          this.assignmentCreateInput(ownerId, assignment),
        ),
      }),
    ]);
  }

  private providerFromRecord(record: AiProviderConfigRecord): PersistedConfig['providers'][number] {
    return {
      id: record.providerId,
      name: record.name,
      shortName: record.shortName,
      avatar: record.avatar ?? undefined,
      description: record.description,
      baseUrl: record.baseUrl,
      status: record.status as AiProvider['status'],
      category: record.category as AiProvider['category'],
      authType: record.authType as AiProvider['authType'],
      requestFormat: (record.requestFormat ?? undefined) as AiProvider['requestFormat'],
      credentialMode: record.credentialMode as AiProvider['credentialMode'],
      billingMode: record.billingMode as AiProvider['billingMode'],
      modelSyncMode: record.modelSyncMode as AiProvider['modelSyncMode'],
      credentialState: record.credentialState as AiProvider['credentialState'],
      priority: record.priority,
      custom: record.custom ?? undefined,
      credential: this.credentialFromJson(record.credential),
    };
  }

  private modelFromRecord(record: AiModelConfigRecord): AiModel {
    return {
      id: record.modelId,
      providerId: record.providerId,
      name: record.name,
      displayName: record.displayName,
      avatar: record.avatar ?? undefined,
      contextWindow: record.contextWindow,
      modelType: record.modelType as AiModelType,
      extensionParameters: this.arrayFromJson<AiModelExtensionParameter>(
        record.extensionParameters,
      ),
      capabilities: this.arrayFromJson<AiModel['capabilities'][number]>(record.capabilities),
      maxOutput: record.maxOutput ?? undefined,
      enabled: record.enabled,
      recommended: record.recommended,
      availability: record.availability as AiModel['availability'],
      lastLatencyMs: record.lastLatencyMs,
      priceHint: record.priceHint,
      catalogSource: (record.catalogSource ?? undefined) as AiModel['catalogSource'],
      pricing: this.optionalJson<AiModel['pricing']>(record.pricing),
      releasedAt: record.releasedAt ?? undefined,
      lobeMetadata: this.optionalJson<AiModel['lobeMetadata']>(record.lobeMetadata),
      defaultParameterConfig: this.recordFromJson(record.defaultParameterConfig),
      parameterConfig: this.recordFromJson(record.parameterConfig),
      custom: record.custom ?? undefined,
    };
  }

  private assignmentFromRecord(record: AiModelAssignmentConfigRecord): AiAssignmentUpdate {
    return {
      useCase: record.useCase as AiAssignmentUpdate['useCase'],
      primaryModelId: record.primaryModelId,
      fallbackModelIds: this.arrayFromJson<string>(record.fallbackModelIds),
    };
  }

  private providerCreateInput(
    ownerId: string,
    provider: PersistedConfig['providers'][number],
  ): Prisma.AiProviderConfigCreateManyInput {
    return {
      ownerId,
      providerId: provider.id,
      name: provider.name,
      shortName: provider.shortName,
      avatar: provider.avatar,
      description: provider.description,
      baseUrl: provider.baseUrl,
      status: provider.status,
      category: provider.category,
      authType: provider.authType,
      requestFormat: provider.requestFormat,
      credentialMode: provider.credentialMode,
      billingMode: provider.billingMode,
      modelSyncMode: provider.modelSyncMode,
      credentialState: provider.credentialState,
      priority: provider.priority,
      custom: provider.custom,
      credential: this.jsonOrUndefined(provider.credential),
    };
  }

  private modelCreateInput(ownerId: string, model: AiModel): Prisma.AiModelConfigCreateManyInput {
    return {
      ownerId,
      modelId: model.id,
      providerId: model.providerId,
      name: model.name,
      displayName: model.displayName,
      avatar: model.avatar,
      contextWindow: model.contextWindow,
      modelType: model.modelType,
      extensionParameters: model.extensionParameters,
      capabilities: model.capabilities,
      maxOutput: model.maxOutput,
      enabled: model.enabled,
      recommended: model.recommended,
      availability: model.availability,
      lastLatencyMs: model.lastLatencyMs,
      priceHint: model.priceHint,
      catalogSource: model.catalogSource,
      pricing: this.jsonOrUndefined(model.pricing),
      releasedAt: model.releasedAt,
      lobeMetadata: this.jsonOrUndefined(model.lobeMetadata),
      defaultParameterConfig: this.jsonOrUndefined(model.defaultParameterConfig),
      parameterConfig: this.jsonOrUndefined(model.parameterConfig),
      custom: model.custom,
    };
  }

  private assignmentCreateInput(
    ownerId: string,
    assignment: AiAssignmentUpdate,
  ): Prisma.AiModelAssignmentConfigCreateManyInput {
    return {
      ownerId,
      useCase: assignment.useCase,
      primaryModelId: assignment.primaryModelId,
      fallbackModelIds: assignment.fallbackModelIds,
    };
  }

  private credentialFromJson(value: Prisma.JsonValue | null): PersistedCredential | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const credential = value as Record<string, unknown>;
    if (
      typeof credential.iv === 'string' &&
      typeof credential.tag === 'string' &&
      typeof credential.value === 'string'
    ) {
      return {
        iv: credential.iv,
        tag: credential.tag,
        value: credential.value,
      };
    }
    return undefined;
  }

  private arrayFromJson<T extends string>(value: Prisma.JsonValue): T[] {
    return Array.isArray(value) ? value.filter((item): item is T => typeof item === 'string') : [];
  }

  private optionalJson<T>(value: Prisma.JsonValue | null): T | undefined {
    return value === null ? undefined : (value as T);
  }

  private recordFromJson(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private jsonOrUndefined(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
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
    return (
      value
        .trim()
        .split(/[-_\\s:/.]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'AI'
    );
  }
}
