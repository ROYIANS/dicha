import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

class EnvVars {
  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3100;

  @IsOptional()
  @IsString()
  AI_GATEWAY_INTERNAL_TOKEN?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  AI_GATEWAY_SECRET_KEY?: string;

}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid ai-gateway environment variables:\n${errors.toString()}`);
  }
  if (process.env.NODE_ENV === 'production' && !validated.AI_GATEWAY_SECRET_KEY) {
    throw new Error('Invalid ai-gateway environment variables: AI_GATEWAY_SECRET_KEY is required in production');
  }
  return validated;
}
