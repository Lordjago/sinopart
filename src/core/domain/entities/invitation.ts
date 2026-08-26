import { BaseDomain } from './base.domain';

export enum InvitationStatus {
  ACTIVE = 'active',
  CONSUMED = 'consumed',
  REVOKED = 'revoked',
}

export class Invitation extends BaseDomain {
  code: string;
  storeName?: string;
  /** The admin user id that minted this invite. */
  issuedBy: string;
  consumedBySupplierId?: string | null;
  expiresAt?: Date | null;
  status: InvitationStatus;
}

/**
 * An ACTIVE invite whose expiry has passed is spent in every way that matters,
 * but its stored status is still `active` (nothing rewrites rows on a clock).
 * The admin list needs to say so, so the derivation lives here with the entity.
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  return (
    invitation.status === InvitationStatus.ACTIVE &&
    invitation.expiresAt != null &&
    invitation.expiresAt.getTime() <= Date.now()
  );
}
