/**
 * RolesGuard — authorization, registered globally AFTER AuthGuard
 * ---------------------------------------------------------------------------
 * AuthGuard proves WHO you are (populates request.user); this guard checks
 * WHAT you're allowed to do. It reads @Roles(...) metadata:
 *
 *   - no @Roles on the route            -> allow (authn already handled it)
 *   - @Roles present, user role matches -> allow
 *   - @Roles present, no match          -> ForbiddenError (403)
 *
 * It must run after AuthGuard so request.user exists. Global guards execute in
 * the order they are provided in https.module, so AuthGuard is listed first.
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { ForbiddenError } from '../../../core/errors/forbidden.error';
import { UnauthorizedError } from '../../../core/errors/unauthorized.error';
import type { UserRole } from '../../../core/domain/entities/user';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // No role requirement -> nothing to enforce here.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    // A @Roles route is implicitly authenticated; if AuthGuard let a @Public
    // route through, there is no user to authorize.
    if (!user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!required.includes(user.role as UserRole)) {
      throw new ForbiddenError(
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
