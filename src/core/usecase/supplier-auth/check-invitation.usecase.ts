import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { INVITATION_REPOSITORY } from '../../injection.token';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import { InvitationStatus } from '../../domain/entities/invitation';

export interface InvitationCheckResult {
  valid: boolean;
  storeName?: string;
}

@Injectable()
export class CheckInvitationUseCase extends BaseUseCase<
  string,
  InvitationCheckResult
> {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
  ) {
    super();
  }

  async execute(code: string): Promise<InvitationCheckResult> {
    const invite = await this.invitations.findByCode(code.trim());
    const usable =
      invite &&
      invite.status === InvitationStatus.ACTIVE &&
      (!invite.expiresAt || invite.expiresAt.getTime() > Date.now());

    if (!usable) return { valid: false };
    return { valid: true, storeName: invite.storeName };
  }
}
