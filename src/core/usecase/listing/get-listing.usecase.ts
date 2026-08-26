/**
 * GetListingUseCase: a supplier fetches one of their OWN listings (any status).
 * Ownership is enforced: a supplier can never read another store's listing.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { Listing } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';

export interface GetListingInput {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class GetListingUseCase extends BaseUseCase<GetListingInput, Listing> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute({ supplierId, listingId }: GetListingInput): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');
    if (listing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    return listing;
  }
}
