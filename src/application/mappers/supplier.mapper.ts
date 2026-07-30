import type { Supplier } from '../../core/domain/entities/supplier';
import {
  SupplierAccountStatus,
  SupplierTier,
} from '../../core/domain/entities/supplier';

export class SupplierMapper {
  static toDomain(document: any): Supplier | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      phone: raw.phone,
      storeName: raw.storeName,
      legalName: raw.legalName ?? undefined,
      province: raw.province,
      contactEmail: raw.contactEmail ?? undefined,
      tier: raw.tier,
      accountStatus: raw.accountStatus,
      invitedBy: raw.invitedBy ?? null,
      termsAcceptedAt: raw.termsAcceptedAt ?? null,
      kycDocuments: Array.isArray(raw.kycDocuments)
        ? raw.kycDocuments.map((d: any) => ({
            type: d.type,
            url: d.url,
            status: d.status,
            rejectionReason: d.rejectionReason ?? null,
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
      kycSubmittedAt: raw.kycSubmittedAt ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPersistence(supplier: Partial<Supplier>): Record<string, any> {
    return {
      phone: supplier.phone,
      storeName: supplier.storeName,
      legalName: supplier.legalName ?? null,
      province: supplier.province ?? '',
      contactEmail: supplier.contactEmail ?? null,
      tier: supplier.tier ?? SupplierTier.NEW,
      accountStatus: supplier.accountStatus ?? SupplierAccountStatus.REGISTERED,
      invitedBy: supplier.invitedBy ?? null,
      termsAcceptedAt: supplier.termsAcceptedAt ?? null,
      // Only write these when present, so a plain profile update never clobbers
      // existing KYC data with nulls. Absent key => Mongoose leaves it untouched.
      ...(supplier.kycDocuments !== undefined && {
        kycDocuments: supplier.kycDocuments,
      }),
      ...(supplier.kycSubmittedAt !== undefined && {
        kycSubmittedAt: supplier.kycSubmittedAt,
      }),
      // bankAccount is intentionally NOT written here — it is encrypted and can
      // only be set through the repo's submitForReview path, never a plain update.
    };
  }
}
