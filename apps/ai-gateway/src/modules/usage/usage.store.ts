import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiUsageEvent, AiUsageReport, AiUsageWindow } from '@dicha/shared';
import { buildUsageAnalyticsReport } from './usage.analytics';

type PersistedUsage = {
  events: AiUsageEvent[];
};

type UsageRecord = Omit<AiUsageEvent, 'id' | 'createdAt' | 'totalTokens'> & {
  id?: string;
  createdAt?: string;
  totalTokens?: number;
};

@Injectable()
export class UsageStore {
  private readonly dataDir: string;

  constructor(config: ConfigService) {
    this.dataDir = config.get<string>('AI_GATEWAY_DATA_DIR', './data/ai-gateway');
  }

  async recordEvent(ownerId: string, record: UsageRecord): Promise<AiUsageEvent> {
    const current = await this.readUsage(ownerId);
    const event: AiUsageEvent = {
      ...record,
      id: record.id ?? randomUUID(),
      createdAt: record.createdAt ?? new Date().toISOString(),
      totalTokens: record.totalTokens ?? record.promptTokens + record.completionTokens,
    };
    await this.writeUsage(ownerId, { events: [...current.events, event] });
    return event;
  }

  async getReport(ownerId: string, window: AiUsageWindow): Promise<AiUsageReport> {
    const now = new Date();
    const persisted = await this.readUsage(ownerId);
    const analytics = buildUsageAnalyticsReport(
      persisted.events.filter((event) => event.kind === 'invoke'),
      window,
      now,
    );

    return {
      generatedAt: now.toISOString(),
      window,
      ...analytics,
    };
  }

  private async readUsage(ownerId: string): Promise<PersistedUsage> {
    try {
      const raw = await readFile(this.usagePath(ownerId), 'utf8');
      return JSON.parse(raw) as PersistedUsage;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return { events: [] };
    }
  }

  private async writeUsage(ownerId: string, usage: PersistedUsage): Promise<void> {
    const usagePath = this.usagePath(ownerId);
    await mkdir(dirname(usagePath), { recursive: true, mode: 0o700 });
    await chmod(dirname(usagePath), 0o700);
    const nextPath = `${usagePath}.tmp`;
    await writeFile(nextPath, `${JSON.stringify(usage, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(nextPath, usagePath);
    await chmod(usagePath, 0o600);
  }

  private usagePath(ownerId: string): string {
    const ownerKey = createHash('sha256').update(ownerId).digest('hex').slice(0, 32);
    return join(this.dataDir, 'users', `${ownerKey}.usage.json`);
  }
}
