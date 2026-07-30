/**
 * ListPublicListingsUseCase — the dealer-facing catalog.
 * ---------------------------------------------------------------------------
 * The repo forces status = available, so this can ONLY ever return live
 * listings — drafts, paused, sold and everything else stay private to the
 * supplier. This is the read side of "only published listings reach dealers".
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type {
  ListingRepository,
  PublicListingFilters,
} from '../../interfaces/repository/listing.repository';
import type { Listing } from '../../domain/entities/listing';
import type { Page } from '../../domain/value-object/page';

@Injectable()
export class ListPublicListingsUseCase extends BaseUseCase<
  PublicListingFilters,
  Page<Listing>
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(filters: PublicListingFilters): Promise<Page<Listing>> {
    return this.listings.findPublic(filters);
  }
}
