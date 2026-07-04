import { Module } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogStore } from '../catalog/catalog.store';
import { CreditsModule } from '../credits/credits.module';
import { CreditStore } from '../credits/credit.store';
import { UsageModule } from '../usage/usage.module';
import { UsageStore } from '../usage/usage.store';
import { InvokeController } from './invoke.controller';
import { InvokeAdapterRegistry } from './adapters/invoke-adapter.registry';
import { InvokeService } from './invoke.service';

@Module({
  imports: [CatalogModule, UsageModule, CreditsModule],
  controllers: [InvokeController],
  providers: [
    InvokeAdapterRegistry,
    {
      provide: InvokeService,
      useFactory: (
        catalogStore: CatalogStore,
        creditStore: CreditStore,
        usageStore: UsageStore,
        adapterRegistry: InvokeAdapterRegistry,
      ) => new InvokeService(catalogStore, creditStore, usageStore, adapterRegistry),
      inject: [CatalogStore, CreditStore, UsageStore, InvokeAdapterRegistry],
    },
    InternalTokenGuard,
  ],
})
export class InvokeModule {}
