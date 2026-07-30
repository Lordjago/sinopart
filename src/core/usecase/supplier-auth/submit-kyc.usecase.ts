/**
 * SubmitKycUseCase — send a store for verification (POST /supplier-auth/kyc/submit)
 * ---------------------------------------------------------------------------
 * The final step of the verify-your-store flow. It checks every required
 * document is uploaded, records the bank account (encrypted by the repo) and
 * terms acceptance, and moves the store REGISTERED/ACTION → REVIEW.
 *
 * Guards against re-submitting a store that is already under review or verified,
 * so a double-tap or a stale tab can't reset the workflow.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import { hasAllDocuments, toKycStatus, type KycStatus } from './kyc-status';

export interface SubmitKycInput {
  supplierId: string;
  bankHolder: string;
  bankName: string;
  accountNumber: string;
  termsAccepted: boolean;
}

@Injectable()
export class SubmitKycUseCase extends BaseUseCase<SubmitKycInput, KycStatus> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(input: SubmitKycInput): Promise<KycStatus> {
    if (!input.termsAccepted) {
      throw new ValidationError('Accept the supplier terms to submit.');
    }

    const supplier = await this.suppliers.findById(input.supplierId);
    if (!supplier) {
      throw new ResourceNotFoundError('Supplier not found.');
    }

    if (supplier.accountStatus === SupplierAccountStatus.VERIFIED) {
      throw new ValidationError('Your store is already verified.');
    }
    if (supplier.accountStatus === SupplierAccountStatus.REVIEW) {
      throw new ValidationError(
        'Your store is already under review. Hang tight — we will be in touch.',
      );
    }

    if (!hasAllDocuments(supplier)) {
      throw new ValidationError(
        'Upload all required documents before submitting.',
      );
    }

    const updated = await this.suppliers.submitForReview(
      input.supplierId,
      {
        holder: input.bankHolder,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
      },
      new Date(),
    );

    return toKycStatus(updated);
  }
}
