import type { IdentityVerification } from '../../domain/entities/identity-verification';

/**
 * The audit log of registry lookups.
 *
 * `record` and reads only — there is no update and no delete on purpose. An
 * audit trail that can be rewritten is not evidence of anything.
 */
export interface IdentityVerificationRepository {
  /** Append one attempt. The payload is encrypted by the adapter. */
  record(attempt: IdentityVerification): Promise<IdentityVerification>;

  /** One dealer's attempts, newest first. */
  findByUserId(userId: string, limit?: number): Promise<IdentityVerification[]>;

  /** The most recent attempt for a dealer, or null if never attempted. */
  findLatestForUser(userId: string): Promise<IdentityVerification | null>;
}
