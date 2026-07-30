/**
 * ListSupplierListingsUseCase — ALL of a supplier's own listings, newest first.
 * The supplier UI filters by status tab and tallies counts client-side, so this
 * returns the full set with no server-side status filter or pagination.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { Listing } from '../../domain/entities/listing';

@Injectable()
export class ListSupplierListingsUseCase extends BaseUseCase<
  string,
  Listing[]
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(supplierId: string): Promise<Listing[]> {
    return this.listings.findBySupplier(supplierId);
  }
}
