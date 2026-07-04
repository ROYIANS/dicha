import { Module } from '@nestjs/common';
import { CreditStore } from './credit.store';

@Module({
  providers: [CreditStore],
  exports: [CreditStore],
})
export class CreditsModule {}
