/**
 * SubmitDealerKycUseCase: send the file for review (POST /kyc/submit)
 * ---------------------------------------------------------------------------
 * The last step of the wizard. Everything was saved as the dealer went, so this
 * only checks that nothing is outstanding, records the accuracy confirmation,
 * and hands the file to the back office.
 *
 * The completeness check names WHAT is missing rather than returning a flat
 * "incomplete", because the wizard's job at that point is to send the dealer
 * back to the one step they skipped.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import {
  EDITABLE_DEALER_KYC_STATUSES,
  missingForSubmission,
} from '../../domain/entities/dealer-kyc';
import { DEALER_DOC_LABEL } from './dealer-kyc.labels';
import { ValidationError } from '../../errors/validation.error';
import {
  toDealerKycStatusView,
  type DealerKycStatusView,
} from './dealer-kyc.view';

export interface SubmitDealerKycCommand {
  userId: string;
  /** The dealer ticking "I confirm this is accurate". Refusing is not a submit. */
  termsAccepted: boolean;
}

@Injectable()
export class SubmitDealerKycUseCase extends BaseUseCase<
  SubmitDealerKycCommand,
  DealerKycStatusView
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
    termsAccepted,
  }: SubmitDealerKycCommand): Promise<DealerKycStatusView> {
    if (!termsAccepted) {
      throw new ValidationError(
        'Confirm your details are accurate before submitting.',
      );
    }

    const kyc = await this.dealerKyc.ensureForUser(userId);
    if (!EDITABLE_DEALER_KYC_STATUSES.has(kyc.status)) {
      throw new ValidationError(
        'This verification has already been submitted.',
      );
    }

    const missing = missingForSubmission(kyc);
    if (missing.length) {
      const named = missing.map((m) => DEALER_DOC_LABEL[m] ?? m);
      throw new ValidationError(`Still needed: ${named.join(', ')}.`);
    }

    const submitted = await this.dealerKyc.submitForReview(userId, new Date());
    // Mirror onto the account, so the dashboard and top nav can say "under
    // review" from the session alone rather than fetching the whole file.
    await this.users.setKycStatus(userId, submitted.status);
    return toDealerKycStatusView(submitted);
  }
}
