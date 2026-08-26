/**
 * GetDealerKycStatusUseCase: the dealer's own verification state (GET /kyc/status)
 * ---------------------------------------------------------------------------
 * Drives the wizard: which step to resume on, what has been approved, and what
 * a reviewer asked to be re-sent. Reading is a create-if-absent, because a
 * dealer opening the verification screen for the first time should see an empty
 * form rather than a 404.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY } from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import {
  toDealerKycStatusView,
  type DealerKycStatusView,
} from './dealer-kyc.view';

@Injectable()
export class GetDealerKycStatusUseCase extends BaseUseCase<
  string,
  DealerKycStatusView
> {
  constructor(
    @Inject(DEALER_KYC_REPOSITORY)
    private readonly dealerKyc: DealerKycRepository,
  ) {
    super();
  }

  async execute(userId: string): Promise<DealerKycStatusView> {
    const kyc = await this.dealerKyc.ensureForUser(userId);
    return toDealerKycStatusView(kyc);
  }
}