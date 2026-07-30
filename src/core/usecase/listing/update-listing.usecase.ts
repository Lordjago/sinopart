/**
 * UpdateListingUseCase — edit a listing's fields.
 * ---------------------------------------------------------------------------
 * Allowed only for the owner and only while the listing is in an editable state
 * (draft / available / paused). Once a buyer is involved — reserved, pending,
 * sold — the details are frozen. Lifecycle (publish/pause) is NOT changed here.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import {
  EDITABLE_STATUSES,
  deriveListingTitle,
  type Listing,
} from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface UpdateListingInput extends Partial<Listing> {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class UpdateListingUseCase extends BaseUseCase<
  UpdateListingInput,
  Listing
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(input: UpdateListingInput): Promise<Listing> {
    const { supplierId, listingId, ...patch } = input;

    const existing = await this.listings.findById(listingId);
    if (!existing) throw new ResourceNotFoundError('Listing not found.');
    if (existing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw new ValidationError(
        'This listing can no longer be edited while an order is in progress.',
      );
    }

    // Keep the title in step with identity edits unless one was set explicitly.
    if (patch.title === undefined) {
      const merged = { ...existing, ...patch };
      const derived = deriveListingTitle(merged);
      if (derived !== existing.title) patch.title = derived;
    }

    return this.listings.update(listingId, patch);
  }
}
