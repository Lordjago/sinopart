/**
 * AuthenticateAdminUseCase: back-office sign-in (POST /admin/auth/login)
 * ---------------------------------------------------------------------------
 * Same credentials store as a dealer (one `users` collection, one password
 * hash), but the role is checked HERE, at the door, rather than left to the
 * route guards. Two reasons:
 *
 *   1. A dealer who signs in through the admin panel would otherwise receive a
 *      perfectly valid token and hit a 403 on every screen, a confusing state
 *      to be in, and one that leaks that the credentials were right.
 *   2. It keeps "who may enter the back office" as one statement in one place
 *      (BACK_OFFICE_ROLES) instead of a rule spread over every controller.
 *
 * The failure message never distinguishes "no such email" from "wrong password"
 * from "not staff": all three answer the same way, so the endpoint can't be used
 * to enumerate accounts.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { AUTHENTICATION_SERVICE, USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { BACK_OFFICE_ROLES } from '../../domain/entities/user';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { AuthResponse } from '../../../application/dtos/auth/auth.response';
import type { AdminLoginDto } from '../../../application/dtos/admin/admin-login.dto';

const SAME_ANSWER = 'Email or password is wrong.';

@Injectable()
export class AuthenticateAdminUseCase extends BaseUseCase<
  AdminLoginDto,
  AuthResponse
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {
    super();
  }

  async execute(dto: AdminLoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email, true);
    if (!user) throw new UnauthorizedError(SAME_ANSWER);

    const matches = await this.auth.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!matches) throw new UnauthorizedError(SAME_ANSWER);

    if (!BACK_OFFICE_ROLES.includes(user.role)) {
      throw new UnauthorizedError(SAME_ANSWER);
    }

    const publicUser = UserMapper.toPublic(user);
    const token = this.auth.signToken({
      sub: publicUser.id,
      name: publicUser.name,
      email: publicUser.email,
      role: publicUser.role,
      tier: publicUser.tier,
      verified: publicUser.verified,
    });

    return { user: publicUser, token };
  }
}
