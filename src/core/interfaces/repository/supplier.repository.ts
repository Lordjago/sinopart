import type { Supplier } from '../../domain/entities/supplier';
import type { SupplierAccountStatus } from '../../domain/entities/supplier';
import type {
  BankAccountInput,
  KycDocument,
} from '../../domain/value-object/kyc';

export interface SupplierRepository {
  create(supplier: Supplier): Promise<Supplier>;
  findByPhone(phone: string): Promise<Supplier | null>;
  findById(id: string): Promise<Supplier | null>;
  update(supplier: Supplier): Promise<Supplier>;
  setAccountStatus(
    supplierId: string,
    status: SupplierAccountStatus,
  ): Promise<void>;
  acceptTerms(supplierId: string, at: Date): Promise<void>;
  /**
   * Add a KYC document, replacing any existing one of the same type (re-upload).
   * Atomic on the document, so uploading two different types concurrently can't
   * lose one — unlike a read-modify-write of the whole supplier.
   */
  upsertKycDocument(supplierId: string, doc: KycDocument): Promise<Supplier>;
  /**
   * Store the payout account (number encrypted at rest), stamp the terms
   * acceptance and submission time, and move the store to REVIEW — one atomic
   * write. Returns the updated supplier (bank shown as last4 only).
   */
  submitForReview(
    supplierId: string,
    bank: BankAccountInput,
    at: Date,
  ): Promise<Supplier>;
}
