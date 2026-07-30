/**
 * KYC value objects — the documents and bank details a supplier submits to get
 * their store verified.
 * ---------------------------------------------------------------------------
 * These live in the domain because "a store is verified when all its required
 * documents are approved" is a business rule, not a storage detail. The actual
 * files live in object storage (a storage port, added in a later phase); only
 * the URL/handle is kept here.
 *
 * Review is PER DOCUMENT: an admin can approve the license but bounce the store
 * photo, which moves the supplier to ACTION with one specific thing to resend —
 * not a blanket "resubmit everything".
 */

export enum KycDocumentType {
  BUSINESS_LICENSE = 'business_license',
  IDENTITY = 'identity',
  STORE_PHOTO = 'store_photo',
}

/** The documents a store must supply before it can be verified. Kept as a list
 *  so the submit/review rules can iterate rather than naming each field. */
export const REQUIRED_KYC_DOCUMENTS: KycDocumentType[] = [
  KycDocumentType.BUSINESS_LICENSE,
  KycDocumentType.IDENTITY,
  KycDocumentType.STORE_PHOTO,
];

export enum KycDocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface KycDocument {
  type: KycDocumentType;
  /** Storage handle (e.g. Cloudinary public id / URL). Never the raw file. */
  url: string;
  status: KycDocumentStatus;
  /** Why a REJECTED doc was bounced — shown to the supplier on the resubmit screen. */
  rejectionReason?: string | null;
  uploadedAt: Date;
  reviewedAt?: Date | null;
}

/**
 * Payout destination — the DISPLAY-SAFE view carried on the Supplier entity and
 * returned by /me and the KYC status screen. It deliberately holds only `last4`,
 * never the full account number: the entity flows to the client, and a payout
 * account number is not something to hand back on every profile read.
 */
export interface BankAccountView {
  holder: string;
  bankName: string;
  /** Last 4 digits, for "•••• 3308" style display. */
  last4: string;
}

/**
 * The raw bank details a supplier submits. Lives only transiently — the repo
 * encrypts `accountNumber` at rest and derives `last4`; the cleartext number is
 * never stored plainly and never returned on a normal read.
 */
export interface BankAccountInput {
  holder: string;
  bankName: string;
  accountNumber: string;
}
