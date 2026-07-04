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

  @TsRestHandler(contract.admin.getAiProviderDirectory)
  getAiProviderDirectory(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getAiProviderDirectory>
  > {
    return tsRestHandler(contract.admin.getAiProviderDirectory, async () => ({
      status: 200,
      body: await this.admin.getAiProviderDirectory(),
    }));
  }

  @TsRestHandler(contract.admin.updateAiProviderDirectory)
  updateAiProviderDirectory(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.updateAiProviderDirectory>
  > {
    return tsRestHandler(contract.admin.updateAiProviderDirectory, async ({ body }) => ({
      status: 200,
      body: await this.admin.updateAiProviderDirectory(body),
    }));
  }

  @TsRestHandler(contract.admin.syncAiProviderDirectoryModels)
  syncAiProviderDirectoryModels(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.syncAiProviderDirectoryModels>
  > {
    return tsRestHandler(contract.admin.syncAiProviderDirectoryModels, async ({ body }) => ({
      status: 200,
      body: await this.admin.syncAiProviderDirectoryModels(body),
    }));
  }

  @TsRestHandler(contract.admin.updateAiProviderDirectoryModel)
  updateAiProviderDirectoryModel(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.updateAiProviderDirectoryModel>
  > {
    return tsRestHandler(contract.admin.updateAiProviderDirectoryModel, async ({ body }) => ({
      status: 200,
      body: await this.admin.updateAiProviderDirectoryModel(body),
    }));
  }

  @TsRestHandler(contract.admin.getDichaAiService)
  getDichaAiService(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getDichaAiService>
  > {
    return tsRestHandler(contract.admin.getDichaAiService, async () => ({
      status: 200,
      body: await this.admin.getDichaAiService(),
    }));
  }

  @TsRestHandler(contract.admin.upsertDichaInternalProvider)
  upsertDichaInternalProvider(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.upsertDichaInternalProvider>
  > {
    return tsRestHandler(contract.admin.upsertDichaInternalProvider, async ({ body }) => ({
      status: 200,
      body: await this.admin.upsertDichaInternalProvider(body),
    }));
  }

  @TsRestHandler(contract.admin.syncDichaInternalProviderModels)
  syncDichaInternalProviderModels(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.syncDichaInternalProviderModels>
  > {
    return tsRestHandler(contract.admin.syncDichaInternalProviderModels, async ({ body }) => ({
      status: 200,
      body: await this.admin.syncDichaInternalProviderModels(body),
    }));
  }

  @TsRestHandler(contract.admin.updateDichaModel)
  updateDichaModel(): ReturnType<typeof tsRestHandler<typeof contract.admin.updateDichaModel>> {
    return tsRestHandler(contract.admin.updateDichaModel, async ({ body }) => ({
      status: 200,
      body: await this.admin.updateDichaModel(body),
    }));
  }

  @TsRestHandler(contract.admin.getDichaAiUsage)
  getDichaAiUsage(): ReturnType<typeof tsRestHandler<typeof contract.admin.getDichaAiUsage>> {
    return tsRestHandler(contract.admin.getDichaAiUsage, async ({ query }) => ({
      status: 200,
      body: await this.admin.getDichaAiUsage(query.window, query.logLimit),
    }));
  }
}
