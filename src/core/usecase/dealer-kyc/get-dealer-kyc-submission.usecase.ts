/**
 * GetDealerKycSubmissionUseCase: one dealer's file, for the review desk.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import {
  toDealerKycSubmissionView,
  type DealerKycSubmissionView,
} from './dealer-kyc.view';

@Injectable()
export class GetDealerKycSubmissionUseCase extends BaseUseCase<
  string,
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

  async execute(userId: string): Promise<DealerKycSubmissionView> {
    const kyc = await this.dealerKyc.findByUserId(userId);
    if (!kyc) {
      throw new ResourceNotFoundError(
        'This dealer has not started verification.',
      );
    }
    const user = await this.users.findById(userId);
    return toDealerKycSubmissionView(kyc, user);
  }
}
