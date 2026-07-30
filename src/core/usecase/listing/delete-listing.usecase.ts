/**
 * DeleteListingUseCase — delete/withdraw a listing.
 * Permitted only for the owner and only in a terminal-safe state (draft, paused,
 * failed). A listing tied to a live order (reserved/pending/sold) can't be
 * deleted.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import { DELETABLE_STATUSES } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface DeleteListingInput {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class DeleteListingUseCase extends BaseUseCase<
  DeleteListingInput,
  void
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute({ supplierId, listingId }: DeleteListingInput): Promise<void> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');
    if (listing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    if (!DELETABLE_STATUSES.has(listing.status)) {
      throw new ValidationError(
        'This listing is part of an active order and cannot be deleted.',
      );
    }
    await this.listings.delete(listingId);
  }
}
