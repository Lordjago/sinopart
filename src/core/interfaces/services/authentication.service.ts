export interface AuthenticationService {
  hashPassword(password: string): Promise<string>;

  comparePassword(plain: string, hash: string): Promise<boolean>;

  signToken(claims: Record<string, unknown>): string;
}
