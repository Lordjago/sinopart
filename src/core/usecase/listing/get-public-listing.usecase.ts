/**
 * GetPublicListingUseCase — a single listing for the dealer catalog detail page.
 * Returns it only when AVAILABLE, so a paused/sold/draft id can't be deep-linked
 * into the public catalog.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import { ListingStatus, type Listing } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

@Injectable()
export class GetPublicListingUseCase extends BaseUseCase<string, Listing> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(listingId: string): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing || listing.status !== ListingStatus.AVAILABLE) {
      throw new ResourceNotFoundError('Listing not found.');
    }
    return listing;
  }
}
