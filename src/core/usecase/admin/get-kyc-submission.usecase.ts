/**
 * GetKycSubmissionUseCase: one store's full submission, for the review screen.
 * (GET /admin/kyc/submissions/:supplierId)
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import type { KycSubmissionView } from './admin.views';
import { toKycSubmissionView } from './kyc-submission.view';

@Injectable()
export class GetKycSubmissionUseCase extends BaseUseCase<
  string,
  KycSubmissionView
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(supplierId: string): Promise<KycSubmissionView> {
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new ResourceNotFoundError('Supplier not found.');
    return toKycSubmissionView(supplier);
  }
}
