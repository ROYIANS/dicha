import { Injectable } from '@nestjs/common';
import type { AiGatewayCatalog } from '@dicha/shared';
import { aiCatalogSeed } from './catalog.seed';

@Injectable()
export class CatalogService {
  getCatalog(): AiGatewayCatalog {
    return {
      ...aiCatalogSeed,
      generatedAt: new Date().toISOString(),
    };
  }
}

