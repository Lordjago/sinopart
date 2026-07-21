/**
 * @CurrentUser() — hands a controller the authenticated user
 * ---------------------------------------------------------------------------
 * A custom parameter decorator. After the AuthGuard verifies the token it puts
 * the decoded principal on `request.user`; this decorator reads it back out and
 * injects it (typed as AuthUser) into the handler:
 *
 *     me(@CurrentUser() user: AuthUser) { ... }
 *
 * Keep it paired with a protected route — on a @Public() route there is no
 * `request.user` to read.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
