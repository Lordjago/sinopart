/**
 * CreateStaffUseCase: mint a back-office account (admin or inspector).
 * ---------------------------------------------------------------------------
 * Two doors lead here and they are NOT the same door:
 *
 *   - `execute`. An existing admin adding a colleague. Guarded by @Roles.
 *   - `bootstrap`. The very first admin, when the platform has none. It cannot
 *     be role-guarded (there is nobody to authorise it yet), so it guards
 *     ITSELF: the moment one admin exists the endpoint is closed forever. That
 *     is the whole reason it is safe to expose publicly.
 *
 * Both paths reuse the same creation logic so a bootstrapped admin is identical
 * in every way to one added later.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { AUTHENTICATION_SERVICE, USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { UserRole, UserTier, type User } from '../../domain/entities/user';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { PublicUser } from '../../../application/dtos/auth/auth.response';
import type {
  BootstrapAdminDto,
  CreateStaffDto,
} from '../../../application/dtos/admin/create-staff.dto';

@Injectable()
export class CreateStaffUseCase extends BaseUseCase<
  CreateStaffDto,
  PublicUser
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {
    super();
  }

  async execute(dto: CreateStaffDto): Promise<PublicUser> {
    return this.mint(dto.name, dto.email, dto.password, dto.role, dto.phone);
  }

  /** The first admin. Refuses once any admin exists. */
  async bootstrap(dto: BootstrapAdminDto): Promise<PublicUser> {
    if (await this.users.existsWithRole(UserRole.ADMIN)) {
      throw new ForbiddenError(
        'An administrator already exists. Ask them to create your account.',
      );
    }
    return this.mint(dto.name, dto.email, dto.password, UserRole.ADMIN);
  }

  private async mint(
    name: string,
    email: string,
    password: string,
    role: UserRole,
    phone?: string,
  ): Promise<PublicUser> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ResourceAlreadyExistsError('That email is already registered.');
    }

    const user: User = {
      name: name.trim(),
      business: 'SinoPart',
      email,
      phone: phone ?? '',
      passwordHash: await this.auth.hashPassword(password),
      role,
      tier: UserTier.TIER_1,
      verified: true,
      emailVerified: true,
    };

    return UserMapper.toPublic(await this.users.create(user));
  }
}
