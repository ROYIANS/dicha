import { Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@dicha/shared';
import { AuthGuard } from '../auth/auth.guard';
import { AiGatewayService } from './ai-gateway.service';

@Controller()
@UseGuards(AuthGuard)
export class AiGatewayController {
  constructor(private readonly aiGateway: AiGatewayService) {}

  @TsRestHandler(contract.ai.getCatalog)
  getCatalog(): ReturnType<typeof tsRestHandler<typeof contract.ai.getCatalog>> {
    return tsRestHandler(contract.ai.getCatalog, async () => ({
      status: 200,
      body: await this.aiGateway.getCatalog(),
    }));
  }

  @TsRestHandler(contract.ai.updateConfig)
  updateConfig(): ReturnType<typeof tsRestHandler<typeof contract.ai.updateConfig>> {
    return tsRestHandler(contract.ai.updateConfig, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.updateConfig(body),
    }));
  }
}
