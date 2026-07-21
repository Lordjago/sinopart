/**
 * Environment variable validation
 * ---------------------------------------------------------------------------
 * We validate the whole environment ONCE at startup and crash early with a clear
 * message if anything is missing or malformed — far better than failing deep
 * inside a request later. `ConfigModule.forRoot({ validate: validateEnv })` (in
 * app.module) runs this against `process.env` on boot.
 *
 * We reuse the same class-validator decorators here that DTOs use for request
 * bodies, so there is one validation system to learn across the whole app.
 */
import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

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

  // ---- Email (all required) ----
  // SendByte is the only mail adapter, so the app refuses to boot without a
  // full mail configuration. Failing here beats discovering at the first OTP
  // that nothing can be delivered.

  /** SendByte secret key. */
  @IsString()
  @MinLength(1)
  SENDBYTE_API_KEY: string;

  /** Sender identity, e.g. "SinoPart <noreply@sinopart.africa>". */
  @IsString()
  @MinLength(1)
  MAIL_FROM: string;

  /** Mailbox that receives quote and waitlist alerts. */
  @IsEmail()
  ADMIN_EMAIL: string;
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
