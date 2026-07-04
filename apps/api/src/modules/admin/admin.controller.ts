import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@dicha/shared';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { AdminService } from './admin.service';

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
  constructor(private readonly admin: AdminService) {}

  @TsRestHandler(contract.admin.getOverview)
  getOverview(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.getOverview>> {
    return tsRestHandler(contract.admin.getOverview, async () => ({
      status: 200,
      body: await this.admin.getOverview(request.user),
    }));
  }

  @TsRestHandler(contract.admin.listUsers)
  listUsers(): ReturnType<typeof tsRestHandler<typeof contract.admin.listUsers>> {
    return tsRestHandler(contract.admin.listUsers, async ({ query }) => ({
      status: 200,
      body: await this.admin.listUsers(query),
    }));
  }

  @TsRestHandler(contract.admin.getUser)
  getUser(): ReturnType<typeof tsRestHandler<typeof contract.admin.getUser>> {
    return tsRestHandler(contract.admin.getUser, async ({ params }) => {
      const user = await this.admin.getUser(params.id);
      if (!user) {
        return { status: 404, body: { message: 'User not found' } };
      }
      return { status: 200, body: user };
    });
  }

  @TsRestHandler(contract.admin.getAiProviders)
  getAiProviders(): ReturnType<typeof tsRestHandler<typeof contract.admin.getAiProviders>> {
    return tsRestHandler(contract.admin.getAiProviders, async () => ({
      status: 200,
      body: await this.admin.getAiProviders(),
    }));
  }

  @TsRestHandler(contract.admin.upsertAiSystemChannel)
  upsertAiSystemChannel(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.upsertAiSystemChannel>
  > {
    return tsRestHandler(contract.admin.upsertAiSystemChannel, async ({ body }) => ({
      status: 200,
      body: await this.admin.upsertAiSystemChannel(body),
    }));
  }
}
