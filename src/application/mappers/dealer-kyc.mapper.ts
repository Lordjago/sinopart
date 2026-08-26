import type { DealerKyc } from '../../core/domain/entities/dealer-kyc';
import { DealerKycStatus } from '../../core/domain/entities/dealer-kyc';

/**
 * Document ⇄ entity for a dealer's verification file.
 *
 * Note what does NOT come back: `idNumberEnc` and `accountNumberEnc` are read
 * from the collection but never mapped onto the entity. The entity is what
 * flows to the views and out to the client, so leaving the ciphertext behind
 * here is what guarantees a BVN or an account number cannot leak by someone
 * later adding a field to a view.
 */
export class DealerKycMapper {
  static toDomain(document: any): DealerKyc | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      userId: raw.userId?.toString(),
      status: raw.status ?? DealerKycStatus.DRAFT,
      idType: raw.idType ?? null,
      idLast4: raw.idLast4 ?? null,
      businessName: raw.businessName ?? null,
      rcNumber: raw.rcNumber ?? null,
      address: raw.address
        ? {
            street: raw.address.street ?? '',
            city: raw.address.city ?? '',
            state: raw.address.state ?? '',
          }
        : null,
      kycDocuments: Array.isArray(raw.kycDocuments)
        ? raw.kycDocuments.map((d: any) => ({
            type: d.type,
            url: d.url,
            filename: d.filename ?? null,
            mimeType: d.mimeType ?? null,
            status: d.status,
            rejectionReason: d.rejectionReason ?? null,
            reviewedBy: d.reviewedBy ?? null,
            uploadedAt: d.uploadedAt,
            reviewedAt: d.reviewedAt ?? null,
          }))
        : [],
      // Display-safe only: last4, never the encrypted number.
      bankAccount: raw.bankAccount
        ? {
            holder: raw.bankAccount.holder,
            bankName: raw.bankAccount.bankName,
            last4: raw.bankAccount.last4,
          }
        : null,
      termsAcceptedAt: raw.termsAcceptedAt ?? null,
      submittedAt: raw.submittedAt ?? null,
      reviewedAt: raw.reviewedAt ?? null,
      reviewedBy: raw.reviewedBy ?? null,
      rejectionReason: raw.rejectionReason ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
