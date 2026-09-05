/**
 * SetDealerVerifiedUseCase: approve (or withdraw) a dealer's KYC.
 * (POST /admin/users/:userId/verification)
 * ---------------------------------------------------------------------------
 * Dealers have no document upload flow yet: their entire KYC is the `verified`
 * flag, checked off by staff after an out-of-band check. This gives the panel
 * an honest control for that rather than pretending a document queue exists.
 *
 * Staff accounts are excluded. An admin toggling their own verification is
 * meaningless, and toggling a colleague's is a footgun with no upside.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { UserRole } from '../../domain/entities/user';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import { UserMapper } from '../../../application/mappers/user.mapper';
import type { PublicUser } from '../../../application/dtos/auth/auth.response';

export interface SetDealerVerifiedInput {
  userId: string;
  verified: boolean;
}

@Injectable()
export class SetDealerVerifiedUseCase extends BaseUseCase<
  SetDealerVerifiedInput,
  PublicUser
> {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {
    super();
  }

  async execute({
    userId,
    verified,
  }: SetDealerVerifiedInput): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new ResourceNotFoundError('User not found.');

    if (user.role !== UserRole.BUYER) {
      throw new ValidationError(
        'Only a dealer account carries a KYC verification flag.',
      );
    }

    return UserMapper.toPublic(await this.users.setVerified(userId, verified));
  }
}
