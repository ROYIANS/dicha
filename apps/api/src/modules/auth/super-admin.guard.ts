import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { isSuperAdminEmail, parseSuperAdminEmails } from './super-admin';

type RequestWithUser = Request & { user?: { email?: string | null } };

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly superAdminEmails: Set<string>;

  constructor(config: ConfigService) {
    this.superAdminEmails = parseSuperAdminEmails(
      config.get<string>('DICHA_SUPER_ADMIN_EMAILS'),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const email = request.user?.email;
    if (email && isSuperAdminEmail(email, this.superAdminEmails)) {
      return true;
    }
    throw new ForbiddenException('Super admin access required');
  }
}
