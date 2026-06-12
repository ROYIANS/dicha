import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsString, Max, Min, validateSync } from 'class-validator';

class EnvVars {
  @IsString()
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  // ── Better Auth ──────────────────────────────────────────
  @IsString()
  BETTER_AUTH_SECRET!: string;

  @IsString()
  BETTER_AUTH_URL!: string;

  // ── GitHub OAuth ─────────────────────────────────────────
  @IsString()
  GITHUB_CLIENT_ID!: string;

  @IsString()
  GITHUB_CLIENT_SECRET!: string;

  // ── SMTP（邮箱验证 + 找回密码）────────────────────────────
  @IsString()
  SMTP_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT!: number;

  @IsString()
  SMTP_USER!: string;

  @IsString()
  SMTP_PASS!: string;

  @IsString()
  SMTP_FROM!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.toString()}`);
  }
  return validated;
}
