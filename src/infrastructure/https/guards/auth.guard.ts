/**
 * AuthGuard: the global gatekeeper (a DRIVING-side adapter concern)
 * ---------------------------------------------------------------------------
 * Registered globally in https.module, so it runs before EVERY handler. Its job:
 *
 *   1. If the route is @Public(), allow it through — but still attach the user
 *      when a valid token happens to be present (see below).
 *   2. Otherwise pull the Bearer token, verify its signature + expiry with
 *      JwtService (using the same secret the token was signed with), and map the
 *      claims into our AuthUser shape on `request.user`.
 *   3. If the token is missing or invalid, throw UnauthorizedError (the
 *      exception filter turns that into a 401).
 *
 * Verifying the token here, once and centrally, means individual controllers
 * never deal with auth; they just read `@CurrentUser()`.
 *
 * WHY PUBLIC ROUTES STILL GET A USER: some screens are readable signed out but
 * answer differently once we know who is asking — the inspection checkout shows
 * the price to anyone, yet must tell a signed-in dealer whether THEY may pay.
 * Without this, such a route has to choose between being public and being
 * personalised. A bad or expired token on a public route is ignored rather than
 * rejected: the route did not require one, so a stale token in a browser must
 * not turn a readable page into a 401.
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorator/is-public.decorator';
import { UnauthorizedError } from '../../../core/errors/unauthorized.error';
import { extractTokenFromHeader } from '../../../core/utils';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';

/** The bit of the request this guard reads and writes. */
interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

/** The claims we sign, as read back off a verified token. */
interface JwtClaims {
  sub: AuthUser['id'];
  name: AuthUser['name'];
  email: AuthUser['email'];
  role: AuthUser['role'];
  tier: AuthUser['tier'];
  verified: AuthUser['verified'];
}

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
    // Typed rather than the default `any`, so assigning `user` below is checked
    // and `extractTokenFromHeader` gets the shape it declares.
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractTokenFromHeader(request);

    if (isPublic) {
      // Best-effort only. No token, or a bad one, simply leaves request.user
      // undefined — the route never asked for it.
      if (token) {
        try {
          request.user = await this.toAuthUser(token);
        } catch {
          /* ignored on purpose: see the class comment */
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required.');
    }

    try {
      request.user = await this.toAuthUser(token);
    } catch {
      throw new UnauthorizedError('Your session is invalid or has expired.');
    }

    return true;
  }

  /** Verify a token and translate its claims into our AuthUser value object. */
  private async toAuthUser(token: string): Promise<AuthUser> {
    const payload = await this.jwtService.verifyAsync<JwtClaims>(token, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });
    // `sub` is the id.
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
      verified: payload.verified,
    };
  }
}
