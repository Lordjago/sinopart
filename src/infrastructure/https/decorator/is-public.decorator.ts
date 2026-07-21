/**
 * @Public() — marks a route as NOT requiring authentication
 * ---------------------------------------------------------------------------
 * The AuthGuard is registered GLOBALLY (see https.module), so every route
 * requires a valid token by default. This decorator stamps metadata the guard
 * reads to WAIVE that requirement for public routes (browse catalog, register,
 * login, health check).
 *
 * `SetMetadata` attaches a key/value to the handler; the guard later reads it
 * back with the Reflector. Defaulting to "secure unless marked public" is safer
 * than "public unless marked secure" — forgetting the decorator fails closed.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
