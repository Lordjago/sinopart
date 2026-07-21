/**
 * utils — small, framework-free helpers shared across the core
 * ---------------------------------------------------------------------------
 * Pure functions only: no NestJS, no Mongoose. Anything that needs those lives
 * in the infrastructure layer instead.
 */
import { randomInt, randomUUID } from 'crypto';

/**
 * Generate a 6-digit OTP code as a string, e.g. "042917".
 *
 * Uses `crypto.randomInt` — NOT `Math.random()`. Math.random is predictable
 * enough that an attacker who sees a few codes could guess the next one; codes
 * that guard a password reset must come from a cryptographic source.
 * `padStart` keeps leading zeros so the code is always exactly 6 characters.
 */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Generate the opaque handle that identifies one OTP attempt. Returned to the
 * client when a code is sent and echoed back on verify/reset, so that knowing
 * the 6 digits alone is not enough to reset an account.
 */
export function generateCodeToken(): string {
  return randomUUID();
}

/**
 * Pull a Bearer token out of an `Authorization` header. Returns `undefined` if
 * the header is missing or is not a Bearer token. Used by the auth guard.
 */
export function extractTokenFromHeader(request: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const header = request.headers['authorization'];
  const value = Array.isArray(header) ? header[0] : header;
  const [type, token] = value?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

/**
 * Derive a display name from an email local-part, e.g.
 * "umar.ishola@example.com" → "Umar Ishola". Used when a user registers without
 * giving a name.
 */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Dealer';
  const nice = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return nice || 'Dealer';
}

/**
 * Turn a filter object into a MongoDB-style query, dropping pagination keys and
 * empty values so only the provided filters are applied. Kept here (pure) so
 * repository adapters can share it.
 */
export function convertToQuery(
  filter: Record<string, unknown>,
): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const key in filter) {
    if (key === 'page' || key === 'limit') continue;
    const value = filter[key];
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value;
    }
  }
  return query;
}
