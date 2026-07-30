import { BaseDomain } from './base.domain';

export enum InvitationStatus {
  ACTIVE = 'active',
  CONSUMED = 'consumed',
  REVOKED = 'revoked',
}

export class Invitation extends BaseDomain {
  code: string;
  storeName?: string;
  issuedBy: string;
  consumedBySupplierId?: string | null;
  expiresAt?: Date | null;
  status: InvitationStatus;
}
