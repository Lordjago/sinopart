/**
 * AuthGuard — the global gatekeeper (a DRIVING-side adapter concern)
 * ---------------------------------------------------------------------------
 * Registered globally in https.module, so it runs before EVERY handler. Its job:
 *
 *   1. If the route is @Public(), allow it straight through.
 *   2. Otherwise pull the Bearer token, verify its signature + expiry with
 *      JwtService (using the same secret the token was signed with), and map the
 *      claims into our AuthUser shape on `request.user`.
 *   3. If the token is missing or invalid, throw UnauthorizedError (the
 *      exception filter turns that into a 401).
 *
 * Verifying the token here — once, centrally — means individual controllers
 * never deal with auth; they just read `@CurrentUser()`.
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorator/is-public.decorator';
import { UnauthorizedError } from '../../../core/errors/unauthorized.error';
import { extractTokenFromHeader } from '../../../core/utils';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Method-level metadata wins over class-level, hence getAllAndOverride.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedError('Authentication required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      // Translate raw JWT claims into our AuthUser value object. `sub` is the id.
      request.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        tier: payload.tier,
        verified: payload.verified,
      };
    } catch {
      throw new UnauthorizedError('Your session is invalid or has expired.');
    }

    return true;
  }
}
