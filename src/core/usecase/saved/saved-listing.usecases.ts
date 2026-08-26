/**
 * A dealer's watchlist: save, unsave, and read it back.
 * (POST /saved, DELETE /saved/:listingId, GET /saved)
 * ---------------------------------------------------------------------------
 * Saving is deliberately weak: it holds nothing, promises nothing and costs
 * nothing. That is the whole difference between this and an inspection, and it
 * is why a saved car can be sold to someone else while it sits on the list.
 *
 * Because of that, the read does NOT hide cars that have moved on. A dealer
 * who saved a car wants to know it sold; dropping the row would just look like
 * the save was lost. Each row carries the listing's live status so the page can
 * flag it.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  LISTING_REPOSITORY,
  SAVED_LISTING_REPOSITORY,
  SUPPLIER_REPOSITORY,
} from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SavedListingRepository } from '../../interfaces/repository/saved-listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import {
  toPublicListingView,
  type PublicListingView,
} from '../listing/public-listing.view';

export interface SaveListingInput {
  userId: string;
  listingId: string;
}

/** A watchlist row: the car, plus who is selling it and when it was saved. */
export interface SavedListingView {
  listingId: string;
  savedAt?: Date;
  car: PublicListingView;
  store: { id: string; name: string; province: string } | null;
}

@Injectable()
export class SaveListingUseCase extends BaseUseCase<
  SaveListingInput,
  { saved: true; listingId: string }
> {
  constructor(
    @Inject(SAVED_LISTING_REPOSITORY)
    private readonly saved: SavedListingRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute({ userId, listingId }: SaveListingInput) {
    // Confirm the car exists before bookmarking it. A watchlist of dead ids is
    // a list of blank cards nobody can explain.
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Car not found.');

    await this.saved.save(userId, listingId);
    return { saved: true as const, listingId };
  }
}

@Injectable()
export class UnsaveListingUseCase extends BaseUseCase<
  SaveListingInput,
  { saved: false; listingId: string }
> {
  constructor(
    @Inject(SAVED_LISTING_REPOSITORY)
    private readonly saved: SavedListingRepository,
  ) {
    super();
  }

  /** Removing something that was never saved is a success, not a 404. */
  async execute({ userId, listingId }: SaveListingInput) {
    await this.saved.remove(userId, listingId);
    return { saved: false as const, listingId };
  }
}

@Injectable()
export class ListSavedListingsUseCase extends BaseUseCase<
  string,
  SavedListingView[]
> {
  constructor(
    @Inject(SAVED_LISTING_REPOSITORY)
    private readonly saved: SavedListingRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(userId: string): Promise<SavedListingView[]> {
    const rows = await this.saved.findByUser(userId);
    if (!rows.length) return [];

    const resolved: (SavedListingView | null)[] = await Promise.all(
      rows.map(async (row) => {
        const listing = await this.listings.findById(row.listingId);
        // A listing deleted outright leaves a dangling bookmark. Drop it here
        // rather than render a card with no car in it.
        if (!listing) return null;

        const supplier = await this.suppliers.findById(listing.supplierId);
        return {
          listingId: row.listingId,
          savedAt: row.createdAt,
          car: toPublicListingView(listing),
          store: supplier
            ? {
                id: supplier._id!,
                name: supplier.storeName,
                province: supplier.province ?? '',
              }
            : null,
        };
      }),
    );

    return resolved.filter((r): r is SavedListingView => r !== null);
  }
}
