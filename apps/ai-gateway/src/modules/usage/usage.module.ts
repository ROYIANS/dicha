import { Module } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageStore } from './usage.store';

@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageStore, InternalTokenGuard],
})
export class UsageModule {}
