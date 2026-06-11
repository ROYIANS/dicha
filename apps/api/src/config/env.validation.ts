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

  @IsString()
  CASDOOR_ENDPOINT!: string;

  @IsString()
  CASDOOR_CLIENT_ID!: string;

  @IsString()
  CASDOOR_CLIENT_SECRET!: string;

  @IsString()
  CASDOOR_ORG!: string;

  @IsString()
  CASDOOR_APP!: string;

  @IsString()
  CASDOOR_CALLBACK_URL!: string;

  @IsString()
  SESSION_SECRET!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.toString()}`);
  }
  return validated;
}
