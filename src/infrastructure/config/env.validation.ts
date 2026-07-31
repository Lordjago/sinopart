import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, Min, MinLength, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  PORT: number;

  @IsString()
  CORS_ORIGIN: string;

  @IsString()
  @MinLength(1)
  MONGODB_URI: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET: string;

  @IsString()
  @MinLength(1)
  JWT_EXPIRES_IN: string;

  @IsString()
  @MinLength(1)
  SENDBYTE_API_KEY: string;

  @IsString()
  @MinLength(1)
  MAIL_FROM: string;

  @IsString()
  @MinLength(1)
  SLACK_WEBHOOK_URL: string;

  @IsString()
  @MinLength(1)
  CLOUDINARY_URL: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // `enableImplicitConversion` lets "3000" (env vars are always strings) become
  // the number 3000 that @IsInt expects.
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map(
          (e) =>
            `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
        )
        .join('\n')}`,
    );
  }

  return validated;
}
