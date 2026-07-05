import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { getAuth } from './auth';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });
    if (!user || user.status === 'disabled') {
      throw new UnauthorizedException('Account disabled');
    }
    (request as Request & { user: typeof session.user }).user = session.user;
    return true;
  }
}
