/**
 * KycStatus — the shape both `GET /kyc/status` and `POST /kyc/submit` return, so
 * the frontend drives its verify screen off one contract regardless of which
 * call it just made.
 */
import type { Supplier } from '../../domain/entities/supplier';
import {
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
  submittedAt: Date | null;
  /** True when every required doc is uploaded-and-not-rejected AND the store is
   *  not already under review / verified — i.e. the submit button is live. */
  canSubmit: boolean;
}

/** Does the store have every required document in a submittable state? */
export function hasAllDocuments(supplier: Supplier): boolean {
  const byType = new Map((supplier.kycDocuments ?? []).map((d) => [d.type, d]));
  return REQUIRED_KYC_DOCUMENTS.every((type) => {
    const doc = byType.get(type);
    return doc != null && doc.status !== KycDocumentStatus.REJECTED;
  });
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
    submittedAt: supplier.kycSubmittedAt ?? null,
    canSubmit: hasAllDocuments(supplier) && !inReviewOrVerified,
  };
}
