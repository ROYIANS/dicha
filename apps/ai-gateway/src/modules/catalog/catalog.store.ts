import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiAssignmentUpdate,
  AiConfigUpdate,
  AiGatewayCatalog,
  AiModel,
  AiModelExtensionParameter,
  AiModelUpdate,
  AiModelType,
  AiProvider,
  AiProviderUpdate,
} from '@dicha/shared';
import { aiCatalogSeed } from './catalog.seed';

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
    const secret =
      config.get<string>('AI_GATEWAY_SECRET_KEY') ??
      config.get<string>('AI_GATEWAY_INTERNAL_TOKEN') ??
      'dicha-ai-gateway-local-dev-secret';
    this.encryptionKey = createHash('sha256').update(secret).digest();
  }

  async getCatalog(ownerId: string): Promise<AiGatewayCatalog> {
    const persisted = await this.readConfig(ownerId);
    return {
      generatedAt: new Date().toISOString(),
      providers: persisted.providers.map(({ credential: _credential, ...provider }) => ({
        ...provider,
        credentialState: this.credentialState(provider.credentialState, _credential),
      })),
      models: persisted.models,
      assignments: persisted.assignments,
    };
  }

  async updateConfig(ownerId: string, update: AiConfigUpdate): Promise<AiGatewayCatalog> {
    const current = await this.readConfig(ownerId);
    const providerPatches = update.providers ?? [];
    const modelPatches = update.models ?? [];

    const providers = current.providers.map((provider) => {
      const patch = providerPatches.find((item) => item.providerId === provider.id);
      if (!patch) return provider;
      const credential = patch.credential ? this.encrypt(patch.credential) : provider.credential;
      const enabled =
        patch.enabled ?? (provider.status === 'enabled' || provider.status === 'needs_config');
      const status: AiProvider['status'] = enabled
        ? credential
          ? 'enabled'
          : 'needs_config'
        : 'disabled';
      return {
        ...provider,
        avatar: patch.avatar ?? provider.avatar,
        baseUrl: patch.baseUrl ?? provider.baseUrl,
        requestFormat: patch.requestFormat ?? provider.requestFormat,
        status,
        credential,
        credentialState: credential ? 'masked' : 'missing',
      } satisfies PersistedConfig['providers'][number];
    });
    const providerAdditions = providerPatches
      .filter((patch) => !current.providers.some((provider) => provider.id === patch.providerId))
      .filter((patch) => this.isProviderCreate(patch))
      .map((patch, index) => this.createProvider(patch, providers.length + index + 1));
    const nextProviders = [...providers, ...providerAdditions];

    const models = current.models.map((model) => {
      const patch = modelPatches.find((item) => item.modelId === model.id);
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
      .filter((patch) => !current.models.some((model) => model.id === patch.modelId))
      .filter((patch) => this.isModelCreate(patch))
      .map((patch) => {
        if (!knownProviderIds.has(patch.providerId)) {
          throw new BadRequestException(`Unknown AI provider: ${patch.providerId}`);
        }
        return this.createModel(patch);
      });

    const assignments = this.mergeAssignments(current.assignments, update.assignments ?? []);
    await this.writeConfig(ownerId, {
      providers: nextProviders,
      models: [...models, ...modelAdditions],
      assignments,
    });
    return this.getCatalog(ownerId);
  }

  async getProviderSecret(ownerId: string, providerId: string): Promise<ProviderSecret | null> {
    const current = await this.readConfig(ownerId);
    const provider = current.providers.find((item) => item.id === providerId);
    if (!provider?.credential) return null;
    const { credential: _credential, ...publicProvider } = provider;
    return {
      provider: {
        ...publicProvider,
        credentialState: this.credentialState(publicProvider.credentialState, _credential),
      },
      secret: this.decrypt(provider.credential),
    };
  }

  async mergeSyncedModels(
    ownerId: string,
    providerId: string,
    syncedModels: string[],
  ): Promise<AiGatewayCatalog> {
    const current = await this.readConfig(ownerId);
    const known = new Set(
      current.models
        .filter((model) => model.providerId === providerId)
        .map((model) => model.name),
    );
    const additions = syncedModels
      .filter((modelName) => !known.has(modelName))
      .map((modelName) => this.syncedModel(providerId, modelName));

    const models = current.models.map((model) =>
      model.providerId === providerId && syncedModels.includes(model.name)
        ? { ...model, availability: model.enabled ? 'healthy' : model.availability }
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
      providers: aiCatalogSeed.providers.map((provider) => ({
        ...provider,
        credentialState: 'missing',
        status: provider.status === 'enabled' ? 'needs_config' : provider.status,
      })),
      models: aiCatalogSeed.models.map((model) => ({
        ...model,
        enabled: model.enabled && model.availability !== 'config_required',
        availability: model.availability === 'healthy' ? 'config_required' : model.availability,
      })),
      assignments: aiCatalogSeed.assignments,
    };
  }

  private normalizeConfig(config: PersistedConfig): PersistedConfig {
    return {
      ...config,
      providers: config.providers.map((provider) => this.normalizeProvider(provider)),
      models: config.models.map((model) => this.normalizeModel(model)),
    };
  }

  private normalizeProvider(
    provider: PersistedConfig['providers'][number],
  ): PersistedConfig['providers'][number] {
    const legacyProvider = provider as PersistedConfig['providers'][number] & {
      avatar?: string;
    };
    return {
      ...provider,
      avatar: legacyProvider.avatar ?? provider.shortName,
    };
  }

  private normalizeModel(model: AiModel): AiModel {
    const legacyModel = model as AiModel & {
      avatar?: string;
      modelType?: AiModelType;
      extensionParameters?: AiModelExtensionParameter[];
    };
    return {
      ...model,
      avatar: legacyModel.avatar ?? this.modelAvatar(model.displayName || model.name),
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
    },
    priority: number,
  ): PersistedConfig['providers'][number] {
    const credential = patch.credential ? this.encrypt(patch.credential) : undefined;
    const enabled = patch.enabled ?? true;
    const status: AiProvider['status'] = enabled
      ? credential
        ? 'enabled'
        : 'needs_config'
      : 'disabled';
    return {
      id: patch.providerId,
      name: patch.name,
      shortName: patch.shortName,
      avatar: patch.avatar ?? patch.shortName,
      description: patch.description,
      baseUrl: patch.baseUrl,
      status,
      authType: patch.authType ?? 'api_key',
      requestFormat: patch.requestFormat ?? 'openai_compatible',
      credentialState: credential ? 'masked' : 'missing',
      priority,
      custom: true,
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
      custom: true,
    };
  }

  private async writeConfig(ownerId: string, config: PersistedConfig): Promise<void> {
    const configPath = this.configPath(ownerId);
    await mkdir(dirname(configPath), { recursive: true });
    const nextPath = `${configPath}.tmp`;
    await writeFile(nextPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    await rename(nextPath, configPath);
  }

  private configPath(ownerId: string): string {
    const ownerKey = createHash('sha256').update(ownerId).digest('hex').slice(0, 32);
    return join(this.dataDir, 'users', `${ownerKey}.json`);
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

  private credentialState(
    current: AiProvider['credentialState'],
    credential: PersistedCredential | undefined,
  ): AiProvider['credentialState'] {
    if (!credential) return 'missing';
    this.decrypt(credential);
    return current === 'configured' ? 'configured' : 'masked';
  }

  private syncedModel(providerId: string, modelName: string): AiModel {
    return {
      id: `${providerId}:${modelName}`,
      providerId,
      name: modelName,
      displayName: modelName,
      avatar: this.modelAvatar(modelName),
      contextWindow: 4096,
      modelType: 'chat',
      extensionParameters: [],
      capabilities: ['chat'],
      enabled: false,
      recommended: false,
      availability: 'unknown',
      lastLatencyMs: null,
      priceHint: '同步自供应商',
    };
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
