export interface PublicUser {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  role: string;
  tier: string;
  emailVerified: boolean;
  verified: boolean;
  /** Mirror of the dealer's KYC file status; null for anyone who has not
   *  started verification, and for every non-dealer role. */
  kycStatus?: string | null;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}
