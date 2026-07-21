/**
 * GetProfileUseCase — return the fresh, current user (GET /auth/me)
 * ---------------------------------------------------------------------------
 * Reads the live record from the database by id rather than trusting the token's
 * claims, so the response always reflects the latest profile and verification
 * status. Takes the user id (from the verified token) and returns the public
 * user shape.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { PublicUser } from '../../../application/dtos/auth/auth.response';

@Injectable()
export class GetProfileUseCase extends BaseUseCase<string, PublicUser> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {
    super();
  }

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Account not found for this session.');
    }
    return UserMapper.toPublic(user);
  }
}
