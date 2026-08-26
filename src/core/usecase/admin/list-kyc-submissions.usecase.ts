/**
 * ListKycSubmissionsUseCase: the review queue (GET /admin/kyc/submissions)
 * ---------------------------------------------------------------------------
 * Only stores that have actually sent something appear: a store that signed up
 * and stopped has nothing to review, and padding the queue with them makes it
 * useless as a work list.
 *
 * Ordered by submission date, newest first (the repository sorts never-submitted
 * stores last), so two reviewers working the same queue can split it by taking
 * from opposite ends and by account status without stepping on each other.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { SupplierAccountStatus } from '../../domain/entities/supplier';
import { Page } from '../../domain/value-object/page';
import type { KycSubmissionView } from './admin.views';
import { toKycSubmissionView } from './kyc-submission.view';

export interface ListKycSubmissionsInput {
  status?: SupplierAccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListKycSubmissionsUseCase extends BaseUseCase<
  ListKycSubmissionsInput,
  Page<KycSubmissionView>
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(
    input: ListKycSubmissionsInput = {},
  ): Promise<Page<KycSubmissionView>> {
    const found = await this.suppliers.findAll({
      status: input.status,
      search: input.search,
      withKycOnly: true,
      page: input.page,
      limit: input.limit,
    });

    return new Page(
      found.data.map(toKycSubmissionView),
      found.page,
      found.limit,
      found.total,
    );
  }
}
