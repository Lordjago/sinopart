import { BaseDomain } from './base.domain';

export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

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
  /** Dealer/KYC verification — unlocks buying. NOT the same as email. */
  verified: boolean;
  /** Whether the sign-up email address has been confirmed by OTP. */
  emailVerified: boolean;
}
