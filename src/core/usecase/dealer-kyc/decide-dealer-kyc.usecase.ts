/**
 * DecideDealerKycUseCase: a decision about the WHOLE application.
 * ---------------------------------------------------------------------------
 * Separate from the per-document desk because the two answer different
 * questions. Bouncing a document says "this file is wrong, send another".
 * This says "we are not verifying this dealer" — or, in the other direction,
 * "approve them, I have seen enough".
 *
 * Approving here approves every uploaded document too, so the review desk does
 * not then show a verified dealer whose documents are all still pending. The
 * derived rule stays the source of truth; this just satisfies it.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import {
  DealerKycStatus,
  hasAllDealerDocuments,
} from '../../domain/entities/dealer-kyc';
import { KycDocumentStatus } from '../../domain/value-object/kyc';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import {
  toDealerKycSubmissionView,
  type DealerKycSubmissionView,
} from './dealer-kyc.view';

export interface DecideDealerKycCommand {
  userId: string;
  /** Approve the dealer outright, or refuse the application. */
  approve: boolean;
  /** Required on a refusal: the dealer is told this. */
  reason?: string;
  reviewerId: string;
}

@Injectable()
export class DecideDealerKycUseCase extends BaseUseCase<
  DecideDealerKycCommand,
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

  async execute({
    userId,
    approve,
    reason,
    reviewerId,
  }: DecideDealerKycCommand): Promise<DealerKycSubmissionView> {
    const kyc = await this.dealerKyc.findByUserId(userId);
    if (!kyc) {
      throw new ResourceNotFoundError(
        'This dealer has not started verification.',
      );
    }

    if (!approve && !reason?.trim()) {
      throw new ValidationError('Tell the dealer why they were refused.');
    }
    if (approve && !hasAllDealerDocuments(kyc)) {
      throw new ValidationError(
        'This dealer has not uploaded every required document yet.',
      );
    }

    const at = new Date();

    if (approve) {
      // Approve each outstanding document so the desk and the account agree.
      const outstanding = (kyc.kycDocuments ?? []).filter(
        (d) => d.status !== KycDocumentStatus.APPROVED,
      );
      for (const doc of outstanding) {
        await this.dealerKyc.reviewKycDocument({
          userId,
          type: doc.type,
          status: KycDocumentStatus.APPROVED,
          reason: null,
          reviewedBy: reviewerId,
          at,
        });
      }
    }

    const nextStatus = approve
      ? DealerKycStatus.VERIFIED
      : DealerKycStatus.REJECTED;
    const settled = await this.dealerKyc.setStatus(userId, nextStatus, {
      reviewedBy: reviewerId,
      reason: approve ? null : reason!.trim(),
      at,
    });
    await this.users.setVerified(userId, approve);
    await this.users.setKycStatus(userId, nextStatus);

    const user = await this.users.findById(userId);
    return toDealerKycSubmissionView(settled, user);
  }
}
