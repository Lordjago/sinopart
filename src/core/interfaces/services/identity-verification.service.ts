/**
 * IdentityVerificationService: "is this BVN/NIN real, and whose is it?"
 * ---------------------------------------------------------------------------
 * The core asks the question; which vendor answers it is an infrastructure
 * detail. Callers hand over a bare identity number and get back a normalised
 * result, so nothing above this line knows Dojah exists.
 *
 * Deliberately NOT `Promise<any>`: the raw provider payload carries far more
 * personal data than we want, and typing the result here is what forces the
 * adapter to throw the rest away rather than let it drift into a view.
 */

/** What the registry says about one identity number. */
export interface IdentityLookupResult {
  /** False when the registry has no such number. Not an error — a real answer. */
  found: boolean;
  firstName: string | null;
  lastName: string | null;
  /** As the registry formats it; we do not parse or re-format it. */
  dateOfBirth: string | null;
  phone: string | null;
  /** The provider's own id for this lookup, kept for the audit trail. */
  reference: string | null;
}

export interface IdentityVerificationService {
  /** Bank Verification Number: 11 digits. */
  lookupBvn(bvn: string): Promise<IdentityLookupResult>;
  /** National Identity Number: 11 digits. */
  lookupNin(nin: string): Promise<IdentityLookupResult>;
}
