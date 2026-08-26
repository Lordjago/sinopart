import type {
  DealerAddress,
  DealerIdType,
  DealerKyc,
  DealerKycStatus,
} from '../../domain/entities/dealer-kyc';
import type {
  BankAccountInput,
  KycDocument,
  KycDocumentStatus,
  KycDocumentType,
} from '../../domain/value-object/kyc';
import type { Page } from '../../domain/value-object/page';

export interface DealerKycFilters {
  status?: DealerKycStatus;
  /** Free text over the dealer's name, email and business name. */
  search?: string;
  /** Only files that have been sent at least once: the review queue. */
  submittedOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * The typed fields a dealer fills in across the wizard steps. Every one is
 * optional because the wizard saves as it goes: step 1 sends an id and nothing
 * else, and must not blank out an address entered on a previous visit.
 */
export interface DealerKycDetailsInput {
  idType?: DealerIdType;
  /** Plaintext BVN/NIN. Encrypted by the adapter; never stored as given. */
  idNumber?: string;
  businessName?: string;
  rcNumber?: string;
  address?: DealerAddress;
}

/** One reviewer's decision on one of a dealer's documents. */
export interface DealerKycReviewInput {
  userId: string;
  type: KycDocumentType;
  status: KycDocumentStatus;
  /** Required for anything other than an approval. */
  reason?: string | null;
  reviewedBy: string;
  at: Date;
}

export interface DealerKycRepository {
  findByUserId(userId: string): Promise<DealerKyc | null>;
  /**
   * The dealer's file, created empty on first touch. Verification is something
   * a dealer starts by doing, so the record appears the moment they save
   * anything rather than at sign-up, where it would leave an empty row against
   * every account that only ever browses.
   */
  ensureForUser(userId: string): Promise<DealerKyc>;
  /** Several at once, so the admin queue resolves its dealers in one query. */
  findByUserIds(userIds: string[]): Promise<DealerKyc[]>;
  /** The admin queue, paginated, most recently submitted first. */
  findAll(filters: DealerKycFilters): Promise<Page<DealerKyc>>;
  /** How many files sit in each status, for the dashboard tiles. */
  countByStatus(): Promise<Record<string, number>>;
  /**
   * Merge in whatever step the dealer just completed. Absent keys are left
   * alone, so saving step 4 cannot erase step 1.
   */
  saveDetails(
    userId: string,
    details: DealerKycDetailsInput,
  ): Promise<DealerKyc>;
  /** Store the payout account, number encrypted at rest, last4 kept for display. */
  saveBankAccount(userId: string, bank: BankAccountInput): Promise<DealerKyc>;
  /**
   * Add a document, replacing any existing one of the same type. Atomic on the
   * document, so two concurrent uploads of different types cannot lose one.
   */
  upsertKycDocument(userId: string, doc: KycDocument): Promise<DealerKyc>;
  /**
   * Record a decision on ONE document, in place. Positional, so two reviewers
   * working different documents of the same dealer cannot overwrite each
   * other. Null when the dealer has no document of that type.
   */
  reviewKycDocument(input: DealerKycReviewInput): Promise<DealerKyc | null>;
  /** Stamp the confirmation and the submission time, and move to REVIEW. */
  submitForReview(userId: string, at: Date): Promise<DealerKyc>;
  /** A whole-application decision, as opposed to a per-document one. */
  setStatus(
    userId: string,
    status: DealerKycStatus,
    decision?: { reviewedBy?: string; reason?: string | null; at?: Date },
  ): Promise<DealerKyc>;
}
