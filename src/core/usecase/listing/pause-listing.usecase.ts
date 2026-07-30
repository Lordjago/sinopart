/**
 * PauseListingUseCase — take a live listing off the dealer catalog (→ paused).
 * Only a currently-available listing can be paused; relisting goes back through
 * PublishListingUseCase (which re-checks verification).
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import { ListingStatus, type Listing } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface PauseListingInput {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class PauseListingUseCase extends BaseUseCase<
  PauseListingInput,
  Listing
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute({
    supplierId,
    listingId,
  }: PauseListingInput): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');
    if (listing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    if (listing.status !== ListingStatus.AVAILABLE) {
      throw new ValidationError('Only a live listing can be paused.');
    }
    return this.listings.setStatus(listingId, ListingStatus.PAUSED);
  }
}
