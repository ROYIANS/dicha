import { Module } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { UsageModule } from '../usage/usage.module';
import { InvokeController } from './invoke.controller';
import { InvokeService } from './invoke.service';

@Module({
  imports: [CatalogModule, UsageModule],
  controllers: [InvokeController],
  providers: [InvokeService, InternalTokenGuard],
})
export class InvokeModule {}
