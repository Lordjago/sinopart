/**
 * ReviewDealerKycDocumentUseCase: one reviewer's decision on one document.
 * ---------------------------------------------------------------------------
 * Review is PER DOCUMENT, the same as it is for a store: an admin can approve
 * the CAC certificate but bounce a cropped utility bill, which moves the dealer
 * to ACTION with one specific thing to re-send rather than a blanket "start
 * again".
 *
 * Approving the last outstanding document is what verifies a dealer. That
 * conclusion is derived from the documents rather than typed by the reviewer,
 * so "verified" can never disagree with what is actually on file.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import {
  DealerKycStatus,
  deriveDealerKycStatus,
  type DealerKyc,
} from '../../domain/entities/dealer-kyc';
import {
  KycDocumentStatus,
  REQUIRED_DEALER_KYC_DOCUMENTS,
  type KycDocumentType,
} from '../../domain/value-object/kyc';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import {
  toDealerKycSubmissionView,
  type DealerKycSubmissionView,
} from './dealer-kyc.view';

/** What a reviewer can do to one document. Mirrors the supplier desk. */
export enum DealerKycDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  NEEDS_INFO = 'needs_info',
}

const DECISION_STATUS: Record<DealerKycDecision, KycDocumentStatus> = {
  [DealerKycDecision.APPROVE]: KycDocumentStatus.APPROVED,
  [DealerKycDecision.REJECT]: KycDocumentStatus.REJECTED,
  [DealerKycDecision.NEEDS_INFO]: KycDocumentStatus.NEEDS_INFO,
};

export interface ReviewDealerKycDocumentCommand {
  userId: string;
  type: KycDocumentType;
  decision: DealerKycDecision;
  reason?: string;
  reviewerId: string;
}

@Injectable()
export class ReviewDealerKycDocumentUseCase extends BaseUseCase<
  ReviewDealerKycDocumentCommand,
  DealerKycSubmissionView
> {
  constructor(
    @Inject(DEALER_KYC_REPOSITORY)
    private readonly dealerKyc: DealerKycRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {
    super();
  }

  async execute(
    input: ReviewDealerKycDocumentCommand,
  ): Promise<DealerKycSubmissionView> {
    if (!REQUIRED_DEALER_KYC_DOCUMENTS.includes(input.type)) {
      throw new ValidationError('That is not a dealer document.');
    }

    // Bouncing something owes the dealer an explanation. Without one they see
    // "rejected" and no way to work out what to do differently.
    if (input.decision !== DealerKycDecision.APPROVE && !input.reason?.trim()) {
      throw new ValidationError('Tell the dealer what to fix.');
    }

    const reviewed = await this.dealerKyc.reviewKycDocument({
      userId: input.userId,
      type: input.type,
      status: DECISION_STATUS[input.decision],
      // An approval clears the previous note, so last round's rejection reason
      // never sits underneath this round's approved file.
      reason:
        input.decision === DealerKycDecision.APPROVE
          ? null
          : (input.reason?.trim() ?? null),
      reviewedBy: input.reviewerId,
      at: new Date(),
    });

    if (!reviewed) {
      throw new ResourceNotFoundError(
        'This dealer has not uploaded that document.',
      );
    }

    const settled = await this.applyDerivedStatus(reviewed, input.reviewerId);
    const user = await this.users.findById(input.userId);
    return toDealerKycSubmissionView(settled, user);
  }

  /**
   * Move the file to wherever the documents now say it belongs, and keep the
   * account's `verified` flag in step. The flag is a mirror of this decision,
   * never an independent answer.
   */
  private async applyDerivedStatus(
    kyc: DealerKyc,
    reviewerId: string,
  ): Promise<DealerKyc> {
    const next = deriveDealerKycStatus(kyc);
    if (next === kyc.status) return kyc;

    const settled = await this.dealerKyc.setStatus(kyc.userId, next, {
      reviewedBy: reviewerId,
      at: new Date(),
    });
    await this.users.setVerified(kyc.userId, next === DealerKycStatus.VERIFIED);
    await this.users.setKycStatus(kyc.userId, next);
    return settled;
  }
}