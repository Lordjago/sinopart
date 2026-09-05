/**
 * Turning a Supplier into the shape the KYC review screen renders.
 * ---------------------------------------------------------------------------
 * Shared by the queue (many stores) and the detail screen (one store) so both
 * count "approved" and "pending" the same way. A queue that disagrees with the
 * page it links to is worse than no queue.
 *
 * All three required documents always appear, missing ones included: a reviewer
 * needs to see that the identity document was never sent, not just fail to find
 * it in the list.
 */
import type { Supplier } from '../../domain/entities/supplier';
import {
  KycDocumentStatus,
  REQUIRED_KYC_DOCUMENTS,
} from '../../domain/value-object/kyc';
import { allDocumentsApproved } from '../supplier-auth/kyc-status';
import type { KycDocumentView, KycSubmissionView } from './admin.views';

export function toKycSubmissionView(supplier: Supplier): KycSubmissionView {
  const byType = new Map((supplier.kycDocuments ?? []).map((d) => [d.type, d]));

  const documents: KycDocumentView[] = REQUIRED_KYC_DOCUMENTS.map((type) => {
    const doc = byType.get(type);
    if (!doc) {
      return {
        type,
        state: 'missing',
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

  return {
    supplierId: supplier._id!,
    storeName: supplier.storeName,
    legalName: supplier.legalName ?? null,
    phone: supplier.phone,
    province: supplier.province ?? '',
    contactEmail: supplier.contactEmail ?? null,
    officeAddress: supplier.officeAddress ?? null,
    accountStatus: supplier.accountStatus,
    submittedAt: supplier.kycSubmittedAt ?? null,
    documents,
    bank: supplier.bankAccount ?? null,
    approvedCount: documents.filter(
      (d) => d.state === KycDocumentStatus.APPROVED,
    ).length,
    pendingCount: documents.filter((d) => d.state === KycDocumentStatus.PENDING)
      .length,
    fullyApproved: allDocumentsApproved(supplier),
  };
}
