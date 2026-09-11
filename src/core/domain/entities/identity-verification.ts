import { BaseDomain } from './base.domain';
import type { DealerIdType } from './dealer-kyc';

/**
 * One attempt to verify one identity number against the registry.
 *
 * Append-only, and deliberately separate from the dealer's KYC file. The file
 * holds the CURRENT answer ("is this dealer's identity verified?"); this holds
 * the HISTORY of how that answer was reached, including the attempts that
 * failed. A dealer who mistypes a BVN twice and succeeds on the third try
 * leaves three rows here and one state on the file.
 *
 * Keeping it apart matters for two reasons. Overwriting a mismatch would erase
 * exactly the evidence a reviewer needs, and an audit trail that can be edited
 * is not an audit trail.
 *
 * WHAT IS NOT HERE: the identity number. Only its last four digits. The number
 * itself lives encrypted on the KYC file and is never copied.
 */
export enum IdentityVerificationOutcome {
  /** Registry knows the number and the name matches the account. */
  VERIFIED = 'verified',
  /** Registry knows the number, but it belongs to a different name. */
  MISMATCH = 'mismatch',
  /** Registry has no such number. */
  NOT_FOUND = 'not_found',
  /** We could not get an answer: outage, timeout, bad credentials. */
  ERROR = 'error',
}

export class IdentityVerification extends BaseDomain {
  /** The dealer whose identity was checked. */
  userId: string;

  idType: DealerIdType;

  /** Last 4 of the number checked, for support and display. Never the number. */
  idLast4: string;

  outcome: IdentityVerificationOutcome;

  /** Why it was not a clean pass. Null on VERIFIED. */
  reason?: string | null;

  /** The provider's id for this lookup, so a row can be traced upstream. */
  providerReference?: string | null;

  /**
   * The trimmed provider payload, encrypted at rest by the repository. Kept so
   * a reviewer can see what the registry actually said, without that payload
   * being readable straight off the collection.
   */
  payload?: Record<string, unknown> | null;

  attemptedAt: Date;
}
