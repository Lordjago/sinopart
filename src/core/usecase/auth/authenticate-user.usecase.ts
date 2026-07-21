import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { AUTHENTICATION_SERVICE, USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { AuthenticationService } from '../../interfaces/services/authentication.service';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { AuthResponse } from '../../../application/dtos/auth/auth.response';
import type { LoginDto } from '../../../application/dtos/auth/login.dto';

@Injectable()
export class AuthenticateUserUseCase extends BaseUseCase<
  LoginDto,
  AuthResponse
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly auth: AuthenticationService,
  ) {
    super();
  }

  async execute(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedError('Email or password is wrong.');
    }

    const matches = await this.auth.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!matches) {
      throw new UnauthorizedError('Email or password is wrong.');
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
