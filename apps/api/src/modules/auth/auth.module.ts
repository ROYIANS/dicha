import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

// Casdoor 的 login/callback/getMe/logout 已由 main.ts 直挂的 Better Auth handler 接管。
// 本模块仅导出 AuthGuard 供业务路由复用。
@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
