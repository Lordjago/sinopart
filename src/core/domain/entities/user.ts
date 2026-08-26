import { BaseDomain } from './base.domain';
import type { DealerKycStatus } from './dealer-kyc';

/**
 * Who a principal is on the platform.
 *
 *   BUYER: a dealer, signs up with email + password.
 *   SELLER: a supplier store. Lives in the `suppliers` collection and signs
 *               in by phone OTP; the role only ever appears as a JWT claim.
 *   INSPECTOR: back-office staff who review KYC submissions. Signs into the
 *               admin panel with email + password, but cannot mint invitations
 *               or manage other staff.
 *   ADMIN: full back-office access.
 */
export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  INSPECTOR = 'inspector',
  ADMIN = 'admin',
}

/** The roles that may sign into the admin panel. */
export const BACK_OFFICE_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.INSPECTOR,
];

export enum UserTier {
  TIER_1 = 'Tier 1',
  TIER_2 = 'Tier 2',
  TIER_3 = 'Tier 3',
  TIER_4 = 'Tier 4',
}

export class User extends BaseDomain {
  name: string;
  business: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  tier: UserTier;
  /** Dealer/KYC verification: unlocks buying. NOT the same as email. */
  verified: boolean;
  /** Whether the sign-up email address has been confirmed by OTP. */
  emailVerified: boolean;
  /**
   * A MIRROR of the dealer's verification file status, kept here so "where is
   * this dealer up to" can be answered from the account alone. The file in the
   * dealerkycs collection is the source of truth; this is written whenever that
   * changes and is never decided independently. Null for anyone who has not
   * started, and for every non-dealer role.
   */
  kycStatus?: DealerKycStatus | null;
}
