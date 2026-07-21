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
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}
