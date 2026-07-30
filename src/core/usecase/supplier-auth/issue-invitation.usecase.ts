import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { INVITATION_REPOSITORY } from '../../injection.token';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import { Invitation, InvitationStatus } from '../../domain/entities/invitation';
import { generateInvitationCode } from '../../utils';

export interface IssueInvitationInput {
  storeName?: string;
  expiresInDays?: number;
  issuedBy: string;
}

@Injectable()
export class IssueInvitationUseCase extends BaseUseCase<
  IssueInvitationInput,
  Invitation
> {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
  ) {
    super();
  }

  async execute(input: IssueInvitationInput): Promise<Invitation> {
    let code = generateInvitationCode();
    for (let i = 0; i < 5 && (await this.invitations.findByCode(code)); i++) {
      code = generateInvitationCode();
    }

    const invitation = new Invitation();
    invitation.code = code;
    invitation.storeName = input.storeName?.trim() || undefined;
    invitation.issuedBy = input.issuedBy;
    invitation.status = InvitationStatus.ACTIVE;
    invitation.expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    return this.invitations.create(invitation);
  }
}
