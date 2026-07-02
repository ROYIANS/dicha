import { Injectable } from '@nestjs/common';
import type { AiUsageReport, AiUsageWindow } from '@dicha/shared';
import { UsageStore } from './usage.store';

@Injectable()
export class UsageService {
  constructor(private readonly store: UsageStore) {}

  getUsage(ownerId: string, window: AiUsageWindow): Promise<AiUsageReport> {
    return this.store.getReport(ownerId, window);
  }
}
