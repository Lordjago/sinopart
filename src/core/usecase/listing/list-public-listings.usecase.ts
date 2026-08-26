/**
 * ListPublicListingsUseCase: the dealer-facing catalog.
 * ---------------------------------------------------------------------------
 * The repo restricts status to PUBLICLY_VISIBLE_STATUSES, so this can only ever
 * return cars a dealer is allowed to see: live ones, plus reserved ones flagged
 * as on hold. Drafts, submissions, paused, sold and failed stay private to the
 * supplier. This is the read side of "only published listings reach dealers".
 *
 * Rows go out through `toPublicListingView`, so the back-office trail on the
 * entity (review notes, proposed catalog entries) never reaches this route.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY } from '../../injection.token';
import type {
  ListingRepository,
  PublicListingFilters,
} from '../../interfaces/repository/listing.repository';
import { Page } from '../../domain/value-object/page';
import {
  toPublicListingView,
  type PublicListingView,
} from './public-listing.view';
import { SettingsService } from '../config/settings.service';

@Injectable()
export class ListPublicListingsUseCase extends BaseUseCase<
  PublicListingFilters,
  Page<PublicListingView>
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute(
    filters: PublicListingFilters,
  ): Promise<Page<PublicListingView>> {
    const [page, rates] = await Promise.all([
      this.listings.findPublic(filters),
      this.settings.pricing(),
    ]);
    return new Page(
      page.data.map((l) => toPublicListingView(l, rates)),
      page.page,
      page.limit,
      page.total,
    );
  }
}
