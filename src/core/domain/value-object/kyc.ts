/**
 * KYC value objects: the documents and bank details a supplier submits to get
 * their store verified.
 * ---------------------------------------------------------------------------
 * These live in the domain because "a store is verified when all its required
 * documents are approved" is a business rule, not a storage detail. The actual
 * files live in object storage (a storage port, added in a later phase); only
 * the URL/handle is kept here.
 *
 * Review is PER DOCUMENT: an admin can approve the license but bounce the store
 * photo, which moves the supplier to ACTION with one specific thing to resend,
 * not a blanket "resubmit everything".
 */

/**
 * Every kind of file either side of the marketplace can be asked for.
 *
 * The two sets are deliberately distinct rather than shared. A store proves it
 * is a real business trading from a real yard; a dealer proves they are a real
 * person who controls a real bank account. "Identity" means a passport page for
 * a supplier and a liveness selfie matched against a BVN for a dealer, and
 * collapsing those onto one member would leave a reviewer unsure which they are
 * looking at. Which set applies is decided by REQUIRED_KYC_DOCUMENTS vs
 * REQUIRED_DEALER_KYC_DOCUMENTS, never by reading the member names.
 */
export enum KycDocumentType {
  // Supplier (store) documents.
  BUSINESS_LICENSE = 'business_license',
  IDENTITY = 'identity',
  STORE_PHOTO = 'store_photo',
  // Dealer (importer) documents.
  CAC_CERTIFICATE = 'cac_certificate',
  PROOF_OF_ADDRESS = 'proof_of_address',
  LIVENESS = 'liveness',
}

/** The documents a store must supply before it can be verified. Kept as a list
 *  so the submit/review rules can iterate rather than naming each field. */
export const REQUIRED_KYC_DOCUMENTS: KycDocumentType[] = [
  KycDocumentType.BUSINESS_LICENSE,
  KycDocumentType.IDENTITY,
  KycDocumentType.STORE_PHOTO,
];

/** The same contract for a dealer: what must be on file before they can buy. */
export const REQUIRED_DEALER_KYC_DOCUMENTS: KycDocumentType[] = [
  KycDocumentType.CAC_CERTIFICATE,
  KycDocumentType.PROOF_OF_ADDRESS,
  KycDocumentType.LIVENESS,
];

/**
 * Where one document stands in review.
 *
 * NEEDS_INFO is a softer REJECTED: the document is not wrong, it is not enough
 * ("the license photo is cropped. Send the whole page"). Both block
 * verification and both invite a re-upload, but the supplier sees a different
 * message, and the reviewer does not have to call a blurry scan a forgery.
 */
export enum KycDocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_INFO = 'needs_info',
}

/** Review outcomes that stop a store being verified and ask for another upload. */
export const BLOCKING_KYC_STATUSES: readonly KycDocumentStatus[] = [
  KycDocumentStatus.REJECTED,
  KycDocumentStatus.NEEDS_INFO,
];

export interface KycDocument {
  type: KycDocumentType;
  /** Storage handle (e.g. Cloudinary public id / URL). Never the raw file. */
  url: string;
  /** The supplier's own name for the file, so a reviewer sees what was sent. */
  filename?: string | null;
  /** `application/pdf` vs an image. The reviewer renders one or the other. */
  mimeType?: string | null;
  status: KycDocumentStatus;
  /** Why a REJECTED / NEEDS_INFO doc was bounced. Shown to the supplier on the
   *  resubmit screen, and written by the reviewer. */
  rejectionReason?: string | null;
  /** The staff user id that last reviewed this document. */
  reviewedBy?: string | null;
  uploadedAt: Date;
  reviewedAt?: Date | null;
}

/**
 * Payout destination: the DISPLAY-SAFE view carried on the Supplier entity and
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
 * The raw bank details a supplier submits. Lives only transiently, the repo
 * encrypts `accountNumber` at rest and derives `last4`; the cleartext number is
 * never stored plainly and never returned on a normal read.
 */
export interface BankAccountInput {
  holder: string;
  bankName: string;
  accountNumber: string;
}
