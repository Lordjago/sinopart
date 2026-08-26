/**
 * SaveDealerBankAccountUseCase: where refunds go (POST /kyc/bank)
 * ---------------------------------------------------------------------------
 * Separate from the other details because the account number is sensitive: it
 * takes its own route so it is written through the one repository path that
 * encrypts, and never rides along in a general-purpose merge.
 *
 * A NUBAN is 10 digits. That is business policy about Nigerian bank accounts,
 * so it is checked here rather than in the HTTP layer.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { DEALER_KYC_REPOSITORY } from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import { EDITABLE_DEALER_KYC_STATUSES } from '../../domain/entities/dealer-kyc';
import { ValidationError } from '../../errors/validation.error';
import {
  toDealerKycStatusView,
  type DealerKycStatusView,
} from './dealer-kyc.view';

const NUBAN_LENGTH = 10;

export interface SaveDealerBankAccountCommand {
  userId: string;
  holder: string;
  bankName: string;
  accountNumber: string;
}

@Injectable()
export class SaveDealerBankAccountUseCase extends BaseUseCase<
  SaveDealerBankAccountCommand,
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
    holder,
    bankName,
    accountNumber,
  }: SaveDealerBankAccountCommand): Promise<DealerKycStatusView> {
    const existing = await this.dealerKyc.ensureForUser(userId);
    if (!EDITABLE_DEALER_KYC_STATUSES.has(existing.status)) {
      throw new ValidationError(
        'Your verification is with our team. You cannot change it while it is being reviewed.',
      );
    }

    const digits = accountNumber.replace(/\D/g, '');
    if (digits.length !== NUBAN_LENGTH) {
      throw new ValidationError('A Nigerian account number is 10 digits.');
    }

    const saved = await this.dealerKyc.saveBankAccount(userId, {
      holder,
      bankName,
      accountNumber: digits,
    });
    return toDealerKycStatusView(saved);
  }
}
