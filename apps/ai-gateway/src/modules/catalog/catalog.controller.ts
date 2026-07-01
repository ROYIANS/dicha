import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AiConfigUpdateSchema,
  AiProviderCheckBodySchema,
  AiProviderSyncModelsBodySchema,
  type AiConfigUpdate,
  type AiConfigUpdateResponse,
  type AiGatewayCatalog,
  type AiProviderCheckBody,
  type AiProviderCheckResponse,
  type AiProviderSyncModelsBody,
  type AiProviderSyncModelsResponse,
} from '@dicha/shared';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { CatalogService } from './catalog.service';

@Controller()
@UseGuards(InternalTokenGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog')
  getCatalog(@Headers('x-dicha-user-id') ownerId: string | undefined): Promise<AiGatewayCatalog> {
    return this.catalog.getCatalog(this.ownerId(ownerId));
  }

  @Patch('config')
  updateConfig(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Body() body: AiConfigUpdate,
  ): Promise<AiConfigUpdateResponse> {
    return this.catalog.updateConfig(this.ownerId(ownerId), AiConfigUpdateSchema.parse(body));
  }

  @Post('providers/sync-models')
  syncProviderModels(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Body() body: AiProviderSyncModelsBody,
  ): Promise<AiProviderSyncModelsResponse> {
    return this.catalog.syncProviderModels(
      this.ownerId(ownerId),
      AiProviderSyncModelsBodySchema.parse(body),
    );
  }

  @Post('providers/check')
  checkProviderConnection(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Body() body: AiProviderCheckBody,
  ): Promise<AiProviderCheckResponse> {
    return this.catalog.checkProviderConnection(
      this.ownerId(ownerId),
      AiProviderCheckBodySchema.parse(body),
    );
  }

  private ownerId(value: string | undefined): string {
    if (!value) {
      throw new BadRequestException('AI Gateway user scope is required');
    }
    return value;
  }
}

