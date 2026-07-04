import { Controller, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract, UserDto, type UserDto as UserDtoType } from '@dicha/shared';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard';

type SessionUser = {
  id: string;
  name?: string | null;
  displayName?: string | null;
  email: string;
  emailVerified?: boolean | null;
  image?: string | null;
  city?: string | null;
  gender?: string | null;
  bio?: string | null;
  personalityArchetype?: string | null;
  homeName?: string | null;
  coins?: number | null;
};

type AuthenticatedRequest = Request & { user: SessionUser };

@Controller()
@UseGuards(AuthGuard)
export class AuthController {
  private readonly superAdminEmails: Set<string>;

  constructor(config: ConfigService) {
    this.superAdminEmails = parseEmailSet(config.get<string>('DICHA_SUPER_ADMIN_EMAILS'));
  }

  @TsRestHandler(contract.account.getMe)
  getMe(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.account.getMe>> {
    return tsRestHandler(contract.account.getMe, async () => ({
      status: 200,
      body: this.toUserDto(request.user),
    }));
  }

  private toUserDto(user: SessionUser): UserDtoType {
    return UserDto.parse({
      id: user.id,
      name: user.name ?? user.email.split('@')[0] ?? '旅人',
      displayName: user.displayName ?? null,
      email: user.email,
      emailVerified: user.emailVerified ?? false,
      image: user.image ?? null,
      city: user.city ?? null,
      gender: user.gender ?? null,
      bio: user.bio ?? null,
      personalityArchetype: user.personalityArchetype ?? null,
      homeName: user.homeName ?? null,
      coins: user.coins ?? 0,
      isSuperAdmin: this.superAdminEmails.has(normalizeEmail(user.email)),
    });
  }
}

function parseEmailSet(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => normalizeEmail(item))
      .filter(Boolean),
  );
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
