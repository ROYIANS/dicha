import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; service: 'ai-gateway' } {
    return { status: 'ok', service: 'ai-gateway' };
  }
}

