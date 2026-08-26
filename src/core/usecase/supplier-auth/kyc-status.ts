/**
 * KycStatus: the shape both `GET /kyc/status` and `POST /kyc/submit` return, so
 * the frontend drives its verify screen off one contract regardless of which
 * call it just made.
 */
import type {
  Supplier,
  SupplierOfficeAddress,
} from '../../domain/entities/supplier';
import {
  BLOCKING_KYC_STATUSES,
  KycDocumentStatus,
  REQUIRED_KYC_DOCUMENTS,
  type BankAccountView,
  type KycDocumentType,
} from '../../domain/value-object/kyc';
import { SupplierAccountStatus } from '../../domain/entities/supplier';

/** `missing` = never uploaded; otherwise the document's own review status. */
export type KycDocState = 'missing' | KycDocumentStatus;

export interface KycDocStatus {
  type: KycDocumentType;
  state: KycDocState;
  rejectionReason: string | null;
}

export interface KycStatus {
  accountStatus: SupplierAccountStatus;
  documents: KycDocStatus[];
  bank: BankAccountView | null;
  /** The office address on file, so a resubmit prefills instead of asking the
   *  store to type it again. Null until the first submission. */
  officeAddress: SupplierOfficeAddress | null;
  submittedAt: Date | null;
  /** True when every required doc is uploaded-and-not-rejected AND the store is
   *  not already under review / verified. I.e. the submit button is live. */
  canSubmit: boolean;
}

/** Does the store have every required document in a submittable state? */
export function hasAllDocuments(supplier: Supplier): boolean {
  const byType = new Map((supplier.kycDocuments ?? []).map((d) => [d.type, d]));
  return REQUIRED_KYC_DOCUMENTS.every((type) => {
    const doc = byType.get(type);
    return doc != null && !BLOCKING_KYC_STATUSES.includes(doc.status);
  });
}

/**
 * Every required document approved: the one condition that verifies a store.
 * The admin review use case runs this after each decision, which is what makes
 * approving the last document flip the account to VERIFIED on its own.
 */
export function allDocumentsApproved(supplier: Supplier): boolean {
  const byType = new Map((supplier.kycDocuments ?? []).map((d) => [d.type, d]));
  return REQUIRED_KYC_DOCUMENTS.every(
    (type) => byType.get(type)?.status === KycDocumentStatus.APPROVED,
  );
}

/** Any required document bounced back to the supplier. */
export function hasBlockedDocuments(supplier: Supplier): boolean {
  return (supplier.kycDocuments ?? []).some((d) =>
    BLOCKING_KYC_STATUSES.includes(d.status),
  );
}

export function toKycStatus(supplier: Supplier): KycStatus {
  const byType = new Map((supplier.kycDocuments ?? []).map((d) => [d.type, d]));

  const documents: KycDocStatus[] = REQUIRED_KYC_DOCUMENTS.map((type) => {
    const doc = byType.get(type);
    return {
      type,
      state: doc ? doc.status : 'missing',
      rejectionReason: doc?.rejectionReason ?? null,
    };
  });

  const inReviewOrVerified =
    supplier.accountStatus === SupplierAccountStatus.REVIEW ||
    supplier.accountStatus === SupplierAccountStatus.VERIFIED;

  return {
    accountStatus: supplier.accountStatus,
    documents,
    bank: supplier.bankAccount ?? null,
    officeAddress: supplier.officeAddress ?? null,
    submittedAt: supplier.kycSubmittedAt ?? null,
    canSubmit: hasAllDocuments(supplier) && !inReviewOrVerified,
  };
}
