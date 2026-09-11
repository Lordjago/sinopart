/**
 * The two shapes a dealer's verification file is read through.
 *
 * `DealerKycStatusView` is what the DEALER sees on their own wizard: where they
 * are, what still needs doing, and why anything was bounced. It carries no
 * reviewer identity — who inside Sinopart pressed reject is back-office
 * information, not something to hand back to the person rejected.
 *
 * `DealerKycSubmissionView` is what the BACK OFFICE sees, and is deliberately
 * shaped like the supplier's `KycSubmissionView`: same `documents` array, same
 * `bank`, same counts. The admin panel's review desk already renders that
 * shape, so a dealer submission drops into it rather than needing a second
 * screen that would inevitably drift from the first.
 */
import {
  allDealerDocumentsApproved,
  IdVerificationStatus,
  missingForSubmission,
  type DealerKyc,
  type DealerKycStatus,
} from '../../domain/entities/dealer-kyc';
import {
  KycDocumentStatus,
  REQUIRED_DEALER_KYC_DOCUMENTS,
  type BankAccountView,
} from '../../domain/value-object/kyc';
import type { User } from '../../domain/entities/user';
import type { KycDocumentView } from '../admin/admin.views';

/** Display-safe business record. Same shape as the entity: nothing sensitive. */
export interface DealerBusinessView {
  name: string | null;
  rcNumber: string | null;
  certificateUrl: string | null;
  certificateFilename: string | null;
  certificateUploadedAt: Date | null;
}

export interface DealerKycStatusView {
  status: DealerKycStatus;
  idType: string | null;
  idLast4: string | null;
  /** Whether the number was checked against the registry, and when. */
  idVerificationStatus: IdVerificationStatus;
  idVerifiedAt: Date | null;
  businessName: string | null;
  rcNumber: string | null;
  /** The grouped business record, with the CAC certificate bound to it. */
  business: DealerBusinessView | null;
  address: { street: string; city: string; state: string } | null;
  documents: KycDocumentView[];
  bank: BankAccountView | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  /** Why the whole application was refused, if it was. */
  rejectionReason: string | null;
  /** Which steps are still outstanding, so the wizard can point at one. */
  missing: string[];
  /** Whether pressing submit would do anything. */
  canSubmit: boolean;
}

export interface DealerKycSubmissionView {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  rcNumber: string | null;
  business: DealerBusinessView | null;
  idType: string | null;
  idLast4: string | null;
  idVerificationStatus: IdVerificationStatus;
  idVerifiedAt: Date | null;
  /** Provider reference for the check, so a reviewer can trace it. */
  idVerificationRef: string | null;
  address: { street: string; city: string; state: string } | null;
  status: DealerKycStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  documents: KycDocumentView[];
  bank: BankAccountView | null;
  approvedCount: number;
  pendingCount: number;
  fullyApproved: boolean;
  /** The mirrored flag on the account, so a queue row can show a disagreement. */
  verified: boolean;
}

/**
 * Every required document, missing ones included. A reviewer needs to see that
 * the proof of address was never sent, not merely fail to find it in a list.
 */
export function toDealerDocumentViews(kyc: DealerKyc): KycDocumentView[] {
  const byType = new Map((kyc.kycDocuments ?? []).map((d) => [d.type, d]));

  return REQUIRED_DEALER_KYC_DOCUMENTS.map((type) => {
    const doc = byType.get(type);
    if (!doc) {
      return {
        type,
        state: 'missing' as const,
        url: null,
        filename: null,
        mimeType: null,
        isPdf: false,
        reason: null,
        reviewedBy: null,
        uploadedAt: null,
        reviewedAt: null,
      };
    }
    return {
      type,
      state: doc.status,
      url: doc.url,
      filename: doc.filename ?? null,
      mimeType: doc.mimeType ?? null,
      // Older uploads predate the stored mime type, so fall back to the URL's
      // extension rather than framing a PDF as a broken image.
      isPdf:
        doc.mimeType === 'application/pdf' ||
        /\.pdf($|\?)/i.test(doc.url ?? ''),
      reason: doc.rejectionReason ?? null,
      reviewedBy: doc.reviewedBy ?? null,
      uploadedAt: doc.uploadedAt ?? null,
      reviewedAt: doc.reviewedAt ?? null,
    };
  });
}

export function toDealerKycStatusView(kyc: DealerKyc): DealerKycStatusView {
  const missing = missingForSubmission(kyc);
  return {
    status: kyc.status,
    idType: kyc.idType ?? null,
    idLast4: kyc.idLast4 ?? null,
    idVerificationStatus:
      kyc.idVerificationStatus ?? IdVerificationStatus.UNVERIFIED,
    idVerifiedAt: kyc.idVerifiedAt ?? null,
    businessName: kyc.businessName ?? null,
    rcNumber: kyc.rcNumber ?? null,
    business: kyc.business ?? null,
    address: kyc.address ?? null,
    documents: toDealerDocumentViews(kyc),
    bank: kyc.bankAccount ?? null,
    submittedAt: kyc.submittedAt ?? null,
    reviewedAt: kyc.reviewedAt ?? null,
    rejectionReason: kyc.rejectionReason ?? null,
    missing,
    canSubmit: missing.length === 0,
  };
}

export function toDealerKycSubmissionView(
  kyc: DealerKyc,
  user?: User | null,
): DealerKycSubmissionView {
  const documents = toDealerDocumentViews(kyc);
  return {
    userId: kyc.userId,
    // A deleted account should leave the row readable rather than blow up a
    // whole page of the queue.
    name: user?.name ?? 'Unknown dealer',
    email: user?.email ?? '',
    phone: user?.phone || null,
    businessName: kyc.businessName ?? user?.business ?? null,
    rcNumber: kyc.rcNumber ?? null,
    business: kyc.business ?? null,
    idType: kyc.idType ?? null,
    idLast4: kyc.idLast4 ?? null,
    idVerificationStatus:
      kyc.idVerificationStatus ?? IdVerificationStatus.UNVERIFIED,
    idVerifiedAt: kyc.idVerifiedAt ?? null,
    idVerificationRef: kyc.idVerificationRef ?? null,
    address: kyc.address ?? null,
    status: kyc.status,
    submittedAt: kyc.submittedAt ?? null,
    reviewedAt: kyc.reviewedAt ?? null,
    reviewedBy: kyc.reviewedBy ?? null,
    rejectionReason: kyc.rejectionReason ?? null,
    documents,
    bank: kyc.bankAccount ?? null,
    approvedCount: documents.filter(
      (d) => d.state === KycDocumentStatus.APPROVED,
    ).length,
    pendingCount: documents.filter((d) => d.state === KycDocumentStatus.PENDING)
      .length,
    fullyApproved: allDealerDocumentsApproved(kyc),
    verified: Boolean(user?.verified),
  };
}
