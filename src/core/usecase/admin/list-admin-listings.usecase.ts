/**
 * ListAdminListingsUseCase: every listing, any status (GET /admin/listings)
 * ---------------------------------------------------------------------------
 * The supplier-facing list is scoped to one store and the dealer catalog is
 * available-only; this one is neither. It exists so an admin can see what is
 * waiting for review, which stores have drafts sitting idle, and what is
 * already live.
 *
 * Each row carries the owning store's name and status, resolved in one batch,
 * "publish this" is a decision about a supplier as much as about a car, and a
 * table that made you click through to learn which store sent it would make
 * that decision slower for no reason.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { ListingStatus } from '../../domain/entities/listing';
import { Page } from '../../domain/value-object/page';
import type { AdminListingView } from './admin.views';
import { toAdminListingView } from './admin-listing.view';

export interface ListAdminListingsInput {
  status?: ListingStatus;
  supplierId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListAdminListingsUseCase extends BaseUseCase<
  ListAdminListingsInput,
  Page<AdminListingView>
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(
    input: ListAdminListingsInput = {},
  ): Promise<Page<AdminListingView>> {
    const found = await this.listings.findAll(input);

    const ids = [...new Set(found.data.map((l) => l.supplierId))];
    const stores = new Map(
      (await this.suppliers.findByIds(ids)).map((s) => [s._id!, s]),
    );

    return new Page(
      found.data.map((l) => toAdminListingView(l, stores.get(l.supplierId))),
      found.page,
      found.limit,
      found.total,
    );
  }
}
