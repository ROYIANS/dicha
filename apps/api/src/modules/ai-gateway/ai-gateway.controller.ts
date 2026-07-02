import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@dicha/shared';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AiGatewayService } from './ai-gateway.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller()
@UseGuards(AuthGuard)
export class AiGatewayController {
  constructor(private readonly aiGateway: AiGatewayService) {}

  @TsRestHandler(contract.ai.getCatalog)
  getCatalog(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.getCatalog>> {
    return tsRestHandler(contract.ai.getCatalog, async () => ({
      status: 200,
      body: await this.aiGateway.getCatalog(request.user.id),
    }));
  }

  @TsRestHandler(contract.ai.updateConfig)
  updateConfig(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.updateConfig>> {
    return tsRestHandler(contract.ai.updateConfig, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.updateConfig(request.user.id, body),
    }));
  }

  @TsRestHandler(contract.ai.syncProviderModels)
  syncProviderModels(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<
    typeof tsRestHandler<typeof contract.ai.syncProviderModels>
  > {
    return tsRestHandler(contract.ai.syncProviderModels, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.syncProviderModels(request.user.id, body),
    }));
  }

  @TsRestHandler(contract.ai.checkProviderConnection)
  checkProviderConnection(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.checkProviderConnection>> {
    return tsRestHandler(contract.ai.checkProviderConnection, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.checkProviderConnection(request.user.id, body),
    }));
  }

  @TsRestHandler(contract.ai.getUsage)
  getUsage(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.getUsage>> {
    return tsRestHandler(contract.ai.getUsage, async ({ query }) => ({
      status: 200,
      body: await this.aiGateway.getUsage(request.user.id, query),
    }));
  }
}
