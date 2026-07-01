import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

class EnvVars {
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
  AI_GATEWAY_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  AI_GATEWAY_DATA_DIR = './data/ai-gateway';
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid ai-gateway environment variables:\n${errors.toString()}`);
  }
  return validated;
}

