/**
 * RegisterUserUseCase — create a new dealer account
 * ---------------------------------------------------------------------------
 * Business steps: reject a duplicate email → hash the password → save the user →
 * issue a JWT. It depends only on PORTS (UserRepository, AuthenticationService),
 * injected by token, so it is pure application logic with no framework or DB
 * knowledge and is trivially unit-testable with fakes.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { AUTHENTICATION_SERVICE, USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { UserRole, UserTier } from '../../domain/entities/user';
import type { User } from '../../domain/entities/user';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { AuthResponse } from '../../../application/dtos/auth/auth.response';
import type { RegisterDto } from '../../../application/dtos/auth/register.dto';
import { nameFromEmail } from '../../utils';

@Injectable()
export class RegisterUserUseCase extends BaseUseCase<
  RegisterDto,
  AuthResponse
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {
    super();
  }

  async execute(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ResourceAlreadyExistsError('That email is already registered.');
    }

    const passwordHash = await this.auth.hashPassword(dto.password);

    const toCreate: User = {
      name: dto.name?.trim() || nameFromEmail(dto.email),
      business: dto.business ?? '',
      email: dto.email,
      phone: dto.phone ?? '',
      passwordHash,
      role: UserRole.BUYER,
      tier: UserTier.TIER_1,
      verified: false, 
      emailVerified: false, 
    };

    const user = await this.userRepository.create(toCreate);
    const publicUser = UserMapper.toPublic(user);

    // `sub` is the standard JWT claim for "who this token is about".
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
