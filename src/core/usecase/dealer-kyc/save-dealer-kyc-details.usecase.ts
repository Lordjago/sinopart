/**
 * SaveDealerKycDetailsUseCase: the typed half of the wizard (POST /kyc/details)
 * ---------------------------------------------------------------------------
 * The importer's wizard saves as it goes, one step at a time, so this is a
 * MERGE: whatever the dealer just filled in is written and everything else is
 * left alone. Sending only an address must never blank out the BVN entered on
 * a previous visit.
 *
 * A dealer whose file is already approved, or is sitting with the back office,
 * cannot quietly edit it underneath the reviewer. They have to be bounced back
 * to ACTION (or refused) first.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY } from '../../injection.token';
import type {
  DealerKycDetailsInput,
  DealerKycRepository,
} from '../../interfaces/repository/dealer-kyc.repository';
import {
  DealerIdType,
  EDITABLE_DEALER_KYC_STATUSES,
} from '../../domain/entities/dealer-kyc';
import { ValidationError } from '../../errors/validation.error';
import {
  toDealerKycStatusView,
  type DealerKycStatusView,
} from './dealer-kyc.view';

/** BVN and NIN are both 11 digits in Nigeria. */
const ID_LENGTH = 11;

export interface SaveDealerKycDetailsCommand extends DealerKycDetailsInput {
  userId: string;
}

@Injectable()
export class SaveDealerKycDetailsUseCase extends BaseUseCase<
  SaveDealerKycDetailsCommand,
  DealerKycStatusView
> {
  constructor(
    @Inject(DEALER_KYC_REPOSITORY)
    private readonly dealerKyc: DealerKycRepository,
  ) {
    super();
  }

  async execute({
    userId,
    ...details
  }: SaveDealerKycDetailsCommand): Promise<DealerKycStatusView> {
    const existing = await this.dealerKyc.ensureForUser(userId);
    if (!EDITABLE_DEALER_KYC_STATUSES.has(existing.status)) {
      throw new ValidationError(
        'Your verification is with our team. You cannot change it while it is being reviewed.',
      );
    }

    if (details.idNumber !== undefined) {
      const digits = details.idNumber.replace(/\D/g, '');
      if (digits.length !== ID_LENGTH) {
        throw new ValidationError(
          `Your ${details.idType === DealerIdType.NIN ? 'NIN' : 'BVN'} is ${ID_LENGTH} digits.`,
        );
      }
      details.idNumber = digits;
    }

    const saved = await this.dealerKyc.saveDetails(userId, details);
    return toDealerKycStatusView(saved);
  }
}
