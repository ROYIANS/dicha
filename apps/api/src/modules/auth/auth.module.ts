import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

// Sign-in/up/out live in the Better Auth handler mounted from main.ts.
// App-owned profile fields such as isSuperAdmin are served by AuthController.
@Module({
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
