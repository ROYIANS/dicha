import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@vidorra/shared';
import { HealthService } from './health.service';

// No path on @Controller — ts-rest derives it from the contract ('/health').
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @TsRestHandler(contract.getHealth)
  getHealth(): ReturnType<typeof tsRestHandler<typeof contract.getHealth>> {
    return tsRestHandler(contract.getHealth, async () => {
      const body = await this.health.check();
      return { status: 200, body };
    });
  }
}
