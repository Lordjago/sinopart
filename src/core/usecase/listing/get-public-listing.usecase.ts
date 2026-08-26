/**
 * GetPublicListingUseCase: a single listing for the dealer catalog detail page.
 *
 * Returns it only for a publicly visible status, so a paused, sold or draft id
 * cannot be deep-linked into the catalog. Reserved IS visible: the browse grid
 * shows reserved cars flagged as on hold, and every one of those cards links
 * here, so refusing them would turn the grid into a page of dead links.
 *
 * Readable is not buyable. Paying is gated by StartInspectionUseCase, which
 * still accepts AVAILABLE and nothing else.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import { PUBLICLY_VISIBLE_STATUSES } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import {
  toPublicListingView,
  type PublicListingView,
} from './public-listing.view';
import { SettingsService } from '../config/settings.service';

@Injectable()
export class GetPublicListingUseCase extends BaseUseCase<
  string,
  PublicListingView
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute(listingId: string): Promise<PublicListingView> {
    const listing = await this.listings.findById(listingId);
    if (!listing || !PUBLICLY_VISIBLE_STATUSES.includes(listing.status)) {
      throw new ResourceNotFoundError('Listing not found.');
    }
    return toPublicListingView(listing, await this.settings.pricing());
  }
}
