import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

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

  // ── ALTCHA（邮箱发码 proof-of-work 防滥用）────────────────
  // 自托管 PoW 的 HMAC 签名密钥；缺失则发码守卫无法校验，故必填（fail fast）。
  // 生成：openssl rand -base64 32
  @IsString()
  ALTCHA_HMAC_SECRET!: string;

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

  // ── 上传存储（头像等用户媒体）─────────────────────────────
  // 容器内持久化目录，由 docker-compose 挂卷映射；本地开发默认进程下的 ./uploads。
  @IsOptional()
  @IsString()
  UPLOAD_DIR = './uploads';
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.toString()}`);
  }
  return validated;
}
