import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiAssignmentUpdate,
  AiConfigUpdate,
  AiGatewayCatalog,
  AiModel,
  AiProvider,
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

@Injectable()
export class CatalogStore {
  private readonly configPath: string;
  private readonly encryptionKey: Buffer;

  constructor(config: ConfigService) {
    const dataDir = config.get<string>('AI_GATEWAY_DATA_DIR', './data/ai-gateway');
    this.configPath = join(dataDir, 'config.json');
    const secret =
      config.get<string>('AI_GATEWAY_SECRET_KEY') ??
      config.get<string>('AI_GATEWAY_INTERNAL_TOKEN') ??
      'dicha-ai-gateway-local-dev-secret';
    this.encryptionKey = createHash('sha256').update(secret).digest();
  }

  async getCatalog(): Promise<AiGatewayCatalog> {
    const persisted = await this.readConfig();
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

  async updateConfig(update: AiConfigUpdate): Promise<AiGatewayCatalog> {
    const current = await this.readConfig();

    const providers = current.providers.map((provider) => {
      const patch = update.providers?.find((item) => item.providerId === provider.id);
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
        baseUrl: patch.baseUrl ?? provider.baseUrl,
        status,
        credential,
        credentialState: credential ? 'masked' : 'missing',
      } satisfies PersistedConfig['providers'][number];
    });

    const models = current.models.map((model) => {
      const patch = update.models?.find((item) => item.modelId === model.id);
      return patch ? { ...model, enabled: patch.enabled } : model;
    });

    const assignments = this.mergeAssignments(current.assignments, update.assignments ?? []);
    await this.writeConfig({ providers, models, assignments });
    return this.getCatalog();
  }

  private async readConfig(): Promise<PersistedConfig> {
    try {
      const raw = await readFile(this.configPath, 'utf8');
      return JSON.parse(raw) as PersistedConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const seeded = this.seedConfig();
      await this.writeConfig(seeded);
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

  private async writeConfig(config: PersistedConfig): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true });
    const nextPath = `${this.configPath}.tmp`;
    await writeFile(nextPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    await rename(nextPath, this.configPath);
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
}
