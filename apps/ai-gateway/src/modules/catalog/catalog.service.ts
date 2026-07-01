import { Injectable } from '@nestjs/common';
import type { AiConfigUpdate, AiConfigUpdateResponse, AiGatewayCatalog } from '@dicha/shared';
import { CatalogStore } from './catalog.store';

@Injectable()
export class CatalogService {
  constructor(private readonly store: CatalogStore) {}

  getCatalog(): Promise<AiGatewayCatalog> {
    return this.store.getCatalog();
  }

  async updateConfig(update: AiConfigUpdate): Promise<AiConfigUpdateResponse> {
    return { catalog: await this.store.updateConfig(update) };
  }
}

