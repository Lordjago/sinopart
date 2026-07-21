import type { User } from '../../domain/entities/user';

export interface UserRepository {
  create(user: User): Promise<User>;

  findByEmail(email: string, withPassword?: boolean): Promise<User | null>;

  findById(id: string): Promise<User | null>;

  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /** Flag the sign-up email as confirmed (used by the email-verification flow). */
  markEmailVerified(userId: string): Promise<void>;
}
