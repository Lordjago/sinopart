/**
 * RevokeInvitationUseCase: kill an unused invite (POST /admin/invitations/:code/revoke)
 * ---------------------------------------------------------------------------
 * Only an ACTIVE invite can be revoked. A consumed one already created a store,
 * and marking it revoked would claim that store was never authorised, so the
 * repository matches on status and this use case reads a null answer as either
 * "no such code" or "already spent", both of which are the same thing to the
 * admin: there is nothing here to revoke.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { INVITATION_REPOSITORY } from '../../injection.token';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import type { Invitation } from '../../domain/entities/invitation';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

@Injectable()
export class RevokeInvitationUseCase extends BaseUseCase<string, Invitation> {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
  ) {
    super();
  }

  async execute(code: string): Promise<Invitation> {
    const revoked = await this.invitations.revoke(code);
    if (!revoked) {
      throw new ResourceNotFoundError(
        'That invitation does not exist, or it has already been used.',
      );
    }
    return revoked;
  }
}
