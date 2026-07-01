import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly expectedToken: string | undefined;

  constructor(config: ConfigService) {
    this.expectedToken = config.get<string>('AI_GATEWAY_INTERNAL_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expectedToken) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.header('x-ai-gateway-token');
    if (token === this.expectedToken) return true;

    throw new UnauthorizedException('Invalid AI Gateway internal token');
  }
}
