/**
 * GetKycStatusUseCase: the supplier's verification state (GET /supplier-auth/kyc/status)
 * ---------------------------------------------------------------------------
 * Drives the "Verify your store" screen: which documents are in, which were
 * bounced (and why), whether the store can submit, and the current review state.
 * Bank is returned display-safe (last4 only).
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { toKycStatus, type KycStatus } from './kyc-status';

@Injectable()
export class GetKycStatusUseCase extends BaseUseCase<string, KycStatus> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(supplierId: string): Promise<KycStatus> {
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) {
      throw new ResourceNotFoundError('Supplier not found.');
    }
    return toKycStatus(supplier);
  }
}
