import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@dicha/shared';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';

type AdminRequest = Request & {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
};

@Controller()
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {
  @TsRestHandler(contract.admin.getOverview)
  getOverview(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.getOverview>> {
    return tsRestHandler(contract.admin.getOverview, async () => ({
      status: 200,
      body: {
        generatedAt: new Date().toISOString(),
        user: {
          id: request.user.id,
          email: request.user.email,
          name: request.user.name ?? request.user.email.split('@')[0] ?? 'admin',
        },
        modules: [
          {
            id: 'dashboard',
            title: 'Dashboard',
            description: '管理系统首页与关键状态入口。',
            status: 'ready',
          },
          {
            id: 'basic',
            title: '基础管理',
            description: '用户、AI 供应商与资源管理的后续入口。',
            status: 'planned',
          },
          {
            id: 'system',
            title: '系统功能',
            description: '服务健康、配置摘要与维护任务入口。',
            status: 'planned',
          },
          {
            id: 'analytics',
            title: '统计看板',
            description: '平台级统计和消费概览的后续入口。',
            status: 'planned',
          },
        ],
      },
    }));
  }
}
