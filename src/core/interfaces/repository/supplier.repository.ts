import type {
  Supplier,
  SupplierOfficeAddress,
} from '../../domain/entities/supplier';
import type { SupplierAccountStatus } from '../../domain/entities/supplier';
import type {
  BankAccountInput,
  KycDocument,
  KycDocumentStatus,
  KycDocumentType,
} from '../../domain/value-object/kyc';
import type { Page } from '../../domain/value-object/page';

export interface SupplierFilters {
  status?: SupplierAccountStatus;
  /** Free text over store name, legal name and phone. */
  search?: string;
  /** Only stores that have uploaded at least one KYC document, the review queue. */
  withKycOnly?: boolean;
  page?: number;
  limit?: number;
}

/** One reviewer's decision on one document. */
export interface KycReviewInput {
  supplierId: string;
  type: KycDocumentType;
  status: KycDocumentStatus;
  /** Required for anything other than an approval. */
  reason?: string | null;
  /** The staff user who decided. */
  reviewedBy: string;
  at: Date;
}

export interface SupplierRepository {
  create(supplier: Supplier): Promise<Supplier>;
  findByPhone(phone: string): Promise<Supplier | null>;
  findById(id: string): Promise<Supplier | null>;
  /**
   * Several stores at once, for enriching a list that references them (admin
   * listings, consumed invitations) without one query per row.
   */
  findByIds(ids: string[]): Promise<Supplier[]>;
  /** The admin directory / KYC queue, paginated, newest first. */
  findAll(filters: SupplierFilters): Promise<Page<Supplier>>;
  /** How many stores sit in each account status, for the dashboard tiles. */
  countByStatus(): Promise<Record<string, number>>;
  update(supplier: Supplier): Promise<Supplier>;
  setAccountStatus(
    supplierId: string,
    status: SupplierAccountStatus,
  ): Promise<void>;
  acceptTerms(supplierId: string, at: Date): Promise<void>;
  /**
   * Add a KYC document, replacing any existing one of the same type (re-upload).
   * Atomic on the document, so uploading two different types concurrently
   * can't lose one, unlike a read-modify-write of the whole supplier.
   */
  upsertKycDocument(supplierId: string, doc: KycDocument): Promise<Supplier>;
  /**
   * Record an admin's decision on ONE document, in place. Positional, so two
   * reviewers working different documents of the same store cannot overwrite
   * each other the way a whole-supplier save would. Returns the updated
   * supplier so the caller can re-evaluate the verification rule, or null when
   * the store has no document of that type.
   */
  reviewKycDocument(input: KycReviewInput): Promise<Supplier | null>;
  /**
   * Store the payout account (number encrypted at rest) and the registered
   * office, stamp the terms acceptance and submission time, and move the store
   * to REVIEW, one atomic write. Returns the updated supplier (bank shown as
   * last4 only).
   *
   * The address's province is written to the supplier's own `province` in the
   * same update, because that is the facet listings and the public store card
   * filter on: keeping them separate would let the two disagree about where a
   * store trades from.
   */
  submitForReview(
    supplierId: string,
    bank: BankAccountInput,
    officeAddress: SupplierOfficeAddress,
    at: Date,
  ): Promise<Supplier>;
}
