import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  AiConfigUpdateSchema,
  type AiConfigUpdate,
  type AiConfigUpdateResponse,
  type AiGatewayCatalog,
} from '@dicha/shared';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { CatalogService } from './catalog.service';

@Controller()
@UseGuards(InternalTokenGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog')
  getCatalog(): Promise<AiGatewayCatalog> {
    return this.catalog.getCatalog();
  }

  @Patch('config')
  updateConfig(@Body() body: AiConfigUpdate): Promise<AiConfigUpdateResponse> {
    return this.catalog.updateConfig(AiConfigUpdateSchema.parse(body));
  }
}

