import { BaseDomain } from './base.domain';
import {
  BLOCKING_KYC_STATUSES,
  KycDocumentStatus,
  REQUIRED_DEALER_KYC_DOCUMENTS,
  type BankAccountView,
  type KycDocument,
  type KycDocumentType,
} from '../value-object/kyc';

/**
 * One dealer's verification file, and its lifecycle.
 *
 *   draft ──submits──▶ review ──all documents approved──▶ verified
 *     ▲                   │
 *     │                   ├──a document bounced──▶ action ──re-uploads──▶ review
 *     │                   └──whole application refused──▶ rejected
 *     └───────────────────────────────────────────────────────┘
 *
 * This lives in its own collection rather than as fields on `User` for two
 * reasons. A User flows through auth on every request and ends up in the JWT,
 * and a BVN, a home address and a bank account have no business travelling
 * there. And verification is a document with a life of its own: it is drafted,
 * submitted, bounced and resubmitted, while the account it belongs to does not
 * change at all. Only `status` is mirrored back onto the User, because "can
 * this dealer buy" is asked on hot paths that should not need a second read.
 *
 * The dealer's own record, not a store's: `userId` is the owner, and every read
 * path is either scoped to that id or is back office.
 */
export enum DealerKycStatus {
  /** Started, not yet sent. The dealer can still change anything. */
  DRAFT = 'draft',
  /** Submitted. Waiting on the back office. */
  REVIEW = 'review',
  /** A reviewer bounced something. The dealer owes us a specific re-upload. */
  ACTION = 'action',
  /** Refused outright, rather than "fix this one thing". */
  REJECTED = 'rejected',
  /** Approved. Buying is unlocked. */
  VERIFIED = 'verified',
}

/** Statuses the dealer may still edit and (re)submit from. */
export const EDITABLE_DEALER_KYC_STATUSES: ReadonlySet<DealerKycStatus> =
  new Set([
    DealerKycStatus.DRAFT,
    DealerKycStatus.ACTION,
    DealerKycStatus.REJECTED,
  ]);

/** Which government id a dealer identified themselves with. */
export enum DealerIdType {
  BVN = 'bvn',
  NIN = 'nin',
}

/**
 * Whether the id above was actually checked against the registry.
 *
 * Separate from DealerKycStatus on purpose: this answers "is the number real
 * and does it belong to this person", while the status answers "has the back
 * office approved the whole application". A dealer can be identity-VERIFIED and
 * still sitting in REVIEW because a utility bill has not been looked at yet.
 */
export enum IdVerificationStatus {
  /** Never checked. The state of every file written before Dojah existed. */
  UNVERIFIED = 'unverified',
  /** Registry confirmed the number and the name matched the account. */
  VERIFIED = 'verified',
  /** Registry knows the number but it belongs to someone else. */
  MISMATCH = 'mismatch',
  /** Registry has no such number. */
  NOT_FOUND = 'not_found',
}

/** Where the dealer trades from. Free text: Nigerian addresses do not
 *  normalise cleanly, and a reviewer reads this against the uploaded bill. */
export interface DealerAddress {
  street: string;
  city: string;
  state: string;
}

/**
 * The dealer's registered business, and the CAC certificate backing it.
 *
 * Grouped rather than left as loose fields because the three belong together: a
 * reviewer's job is to check that the name and RC number on the certificate are
 * the ones typed here, and that comparison is impossible if the file and the
 * text live in unrelated places. The certificate URL is bound at upload time.
 *
 * The certificate's REVIEW STATE is not here — that stays on the KycDocument
 * row, which is what the admin desk approves and rejects. This carries only
 * what the business record needs to be self-describing.
 */
export interface DealerBusiness {
  name: string | null;
  /** CAC registration number, as typed. */
  rcNumber: string | null;
  certificateUrl: string | null;
  certificateFilename: string | null;
  certificateUploadedAt: Date | null;
}

export class DealerKyc extends BaseDomain {
  /** The dealer this file belongs to. One per account, enforced by an index. */
  userId: string;

  status: DealerKycStatus;

  // ----- identity ---------------------------------------------------------
  idType?: DealerIdType | null;
  /** Last 4 of the BVN/NIN, for display. The number itself is encrypted at
   *  rest by the repository and never returned on a read. */
  idLast4?: string | null;
  /** Result of the last registry check. Every attempt, including the ones that
   *  failed, is kept in the `identity_verifications` collection. */
  idVerificationStatus?: IdVerificationStatus | null;
  /** When the identity last came back VERIFIED. Null if it never has. */
  idVerifiedAt?: Date | null;
  /** The provider's id for that check, so a reviewer can trace it upstream. */
  idVerificationRef?: string | null;

  // ----- business ---------------------------------------------------------
  /** Registered business plus its CAC certificate, grouped. */
  business?: DealerBusiness | null;
  /**
   * @deprecated Read `business.name` / `business.rcNumber` instead. These are
   * still written so the admin search index keeps working, and still populated
   * by the mapper for rows saved before `business` existed.
   */
  businessName?: string | null;
  rcNumber?: string | null;

  // ----- address ----------------------------------------------------------
  address?: DealerAddress | null;

  // ----- documents & payout ----------------------------------------------
  kycDocuments: KycDocument[];
  /** Display-safe view only; the account number is encrypted at rest. */
  bankAccount?: BankAccountView | null;

  // ----- lifecycle --------------------------------------------------------
  /** When the dealer ticked the accuracy confirmation on the review step. */
  termsAcceptedAt?: Date | null;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  /** The staff user who last decided on the submission as a whole. */
  reviewedBy?: string | null;
  /** Why the whole application was refused. Per-document reasons live on the
   *  document; this is the blanket one. */
  rejectionReason?: string | null;
}

/** Has every required document been uploaded at all? */
export function hasAllDealerDocuments(kyc: DealerKyc): boolean {
  const present = new Set((kyc.kycDocuments ?? []).map((d) => d.type));
  return REQUIRED_DEALER_KYC_DOCUMENTS.every((type) => present.has(type));
}

/** The single rule that verifies a dealer: every required document approved. */
export function allDealerDocumentsApproved(kyc: DealerKyc): boolean {
  const byType = new Map((kyc.kycDocuments ?? []).map((d) => [d.type, d]));
  return REQUIRED_DEALER_KYC_DOCUMENTS.every(
    (type) => byType.get(type)?.status === KycDocumentStatus.APPROVED,
  );
}

/** Is anything sitting in a state that asks the dealer for another upload? */
export function hasBlockedDealerDocuments(kyc: DealerKyc): boolean {
  return (kyc.kycDocuments ?? []).some((d) =>
    BLOCKING_KYC_STATUSES.includes(d.status),
  );
}

/**
 * Everything the dealer owes us before the submit button means anything.
 * Returned as a list rather than a boolean so the client can say WHICH step is
 * unfinished instead of a flat "something is missing".
 */
export function missingForSubmission(kyc: DealerKyc): string[] {
  const missing: string[] = [];
  if (!kyc.idLast4) missing.push('identity');
  // The RC number is what makes the business step complete; the name alone is
  // not enough to look a company up. Falls back to the flat column so files
  // saved before `business` existed still evaluate correctly.
  if (!(kyc.business?.rcNumber ?? kyc.rcNumber)) missing.push('business');
  if (!kyc.address?.street || !kyc.address?.city || !kyc.address?.state) {
    missing.push('address');
  }
  if (!kyc.bankAccount) missing.push('bank');

  const present = new Set((kyc.kycDocuments ?? []).map((d) => d.type));
  const missingDocs = REQUIRED_DEALER_KYC_DOCUMENTS.filter(
    (type: KycDocumentType) => !present.has(type),
  );
  missing.push(...missingDocs);

  return missing;
}

/**
 * Where a submission lands after a reviewer touches one of its documents.
 *
 * Deliberately never moves a dealer OUT of REJECTED: that was a decision about
 * the whole application, and it takes another whole-application decision to
 * undo, not the approval of one file.
 */
export function deriveDealerKycStatus(kyc: DealerKyc): DealerKycStatus {
  if (kyc.status === DealerKycStatus.REJECTED) return DealerKycStatus.REJECTED;
  if (allDealerDocumentsApproved(kyc)) return DealerKycStatus.VERIFIED;
  if (hasBlockedDealerDocuments(kyc)) return DealerKycStatus.ACTION;
  return kyc.status;
}
