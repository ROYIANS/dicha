import { Module } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogStore } from './catalog.store';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogStore, InternalTokenGuard],
  exports: [CatalogStore],
})
export class CatalogModule {}
