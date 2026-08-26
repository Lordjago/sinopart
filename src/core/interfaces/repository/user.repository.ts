import type { User, UserRole } from '../../domain/entities/user';
import type { Page } from '../../domain/value-object/page';

/** Filters for the back-office users directory. */
export interface UserFilters {
  /** One or more roles. Empty/undefined means every role. */
  roles?: UserRole[];
  /** Free text over name, email and business. */
  search?: string;
  /** KYC/dealer verification state. */
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface UserRepository {
  create(user: User): Promise<User>;

  findByEmail(email: string, withPassword?: boolean): Promise<User | null>;

  findById(id: string): Promise<User | null>;

  /** The admin directory: paginated, newest first. Never returns the hash. */
  findAll(filters: UserFilters): Promise<Page<User>>;

  /**
   * How many users hold each role, as `{ buyer: 12, admin: 2, … }`. Roles with
   * nobody in them are simply absent. Backs the dashboard tiles and the role
   * filter's badges without pulling every row down to count them.
   */
  countByRole(): Promise<Record<string, number>>;

  /** Does anyone hold this role yet? The admin bootstrap gate reads this. */
  existsWithRole(role: UserRole): Promise<boolean>;

  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /** Flag the sign-up email as confirmed (used by the email-verification flow). */
  markEmailVerified(userId: string): Promise<void>;

  /** Admin action: flip a dealer's KYC/verified flag. */
  setVerified(userId: string, verified: boolean): Promise<User>;
  /**
   * Mirror the dealer's KYC file status onto the account. Written only by the
   * dealer-KYC use cases, so the two can never be decided separately.
   */
  setKycStatus(userId: string, status: string | null): Promise<User>;
}
