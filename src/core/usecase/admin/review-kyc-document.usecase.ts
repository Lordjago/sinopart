/**
 * ReviewKycDocumentUseCase: one reviewer's decision on one document
 * (POST /admin/kyc/submissions/:supplierId/review)
 * ---------------------------------------------------------------------------
 * The heart of the back office. A reviewer approves, rejects, or asks for more
 * information on a SINGLE document, and the store's account status is then
 * re-derived from all three:
 *
 *   all three approved            -> VERIFIED   (the store goes live on its own)
 *   any rejected / needs_info     -> ACTION     (supplier has something to fix)
 *   otherwise                     -> unchanged  (still mid-review)
 *
 * Deriving the status rather than setting it per decision is what makes the
 * verification rule reliable: it does not matter which document is approved
 * last, in what order two reviewers work, or whether one of them re-approves
 * something already approved. The answer is always a function of the current
 * three documents, never of the sequence of clicks that produced them.
 *
 * VERIFIED is deliberately not reversed here. Approving a document can promote
 * a store; a single rejection later moves it to ACTION, which is the same
 * derivation, not a special case.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import {
  KycDocumentStatus,
  type KycDocumentType,
} from '../../domain/value-object/kyc';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import {
  allDocumentsApproved,
  hasBlockedDocuments,
} from '../supplier-auth/kyc-status';
import { KycDecision } from '../../../application/dtos/admin/review-kyc.dto';
import type { KycSubmissionView } from './admin.views';
import { toKycSubmissionView } from './kyc-submission.view';

export interface ReviewKycDocumentInput {
  supplierId: string;
  type: KycDocumentType;
  decision: KycDecision;
  reason?: string;
  /** The staff user making the call. Recorded against the document. */
  reviewerId: string;
}

/** decision -> the status written on the document. */
const DECISION_STATUS: Record<KycDecision, KycDocumentStatus> = {
  [KycDecision.APPROVE]: KycDocumentStatus.APPROVED,
  [KycDecision.REJECT]: KycDocumentStatus.REJECTED,
  [KycDecision.NEEDS_INFO]: KycDocumentStatus.NEEDS_INFO,
};

@Injectable()
export class ReviewKycDocumentUseCase extends BaseUseCase<
  ReviewKycDocumentInput,
  KycSubmissionView
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(input: ReviewKycDocumentInput): Promise<KycSubmissionView> {
    const status = DECISION_STATUS[input.decision];
    if (input.decision !== KycDecision.APPROVE && !input.reason?.trim()) {
      throw new ValidationError('Tell the supplier what to fix.');
    }

    const updated = await this.suppliers.reviewKycDocument({
      supplierId: input.supplierId,
      type: input.type,
      status,
      // An approval clears any note from a previous round, so the supplier is
      // not left staring at last week's rejection on an approved document.
      reason:
        input.decision === KycDecision.APPROVE
          ? null
          : (input.reason?.trim() ?? null),
      reviewedBy: input.reviewerId,
      at: new Date(),
    });

    if (!updated) {
      throw new ResourceNotFoundError(
        'That store has not uploaded this document.',
      );
    }

    const nextStatus = this.deriveAccountStatus(updated);
    if (nextStatus && nextStatus !== updated.accountStatus) {
      await this.suppliers.setAccountStatus(input.supplierId, nextStatus);
      updated.accountStatus = nextStatus;
    }

    return toKycSubmissionView(updated);
  }

  /**
   * The account status implied by the documents as they now stand, or null when
   * they imply nothing (still under review).
   */
  private deriveAccountStatus(
    supplier: Parameters<typeof allDocumentsApproved>[0],
  ): SupplierAccountStatus | null {
    if (allDocumentsApproved(supplier)) return SupplierAccountStatus.VERIFIED;
    if (hasBlockedDocuments(supplier)) return SupplierAccountStatus.ACTION;
    return null;
  }
}
