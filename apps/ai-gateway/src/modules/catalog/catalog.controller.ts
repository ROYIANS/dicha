import { Controller, Get } from '@nestjs/common';
import type { AiGatewayCatalog } from '@dicha/shared';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  getCatalog(): AiGatewayCatalog {
    return this.catalog.getCatalog();
  }
}

