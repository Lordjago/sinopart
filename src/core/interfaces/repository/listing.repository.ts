import type { Listing, ListingStatus } from '../../domain/entities/listing';
import type { Page } from '../../domain/value-object/page';

/** Filters for the PUBLIC dealer catalog (status is forced to the publicly
    visible set: available and reserved). */
export interface PublicListingFilters {
  /**
   * Catalog drill-down. All three are stored on the listing itself, so "every
   * Toyota" is one indexed query rather than a walk down brand → series →
   * vehicle → listing.
   */
  brandId?: string;
  seriesId?: string;
  vehicleId?: string;
  /**
   * One store's inventory, for a public storefront. It narrows the SAME
   * query the browse grid runs, so a storefront can never surface a draft or
   * paused car the catalog hides.
   */
  supplierId?: string;
  body?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

/**
 * Filters for the BACK-OFFICE list. Unlike the public catalog this one spans
 * every status (the whole point is to see drafts and submissions), so status
 * is a caller-supplied filter rather than a hard-coded one.
 */
export interface AdminListingFilters {
  status?: ListingStatus;
  supplierId?: string;
  /** Free text over title and VIN. */
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * The review stamps a lifecycle transition may write alongside the status.
 * Only the keys present are written, so publishing does not wipe the note that
 * explains an earlier return.
 */
export interface ListingReviewTrail {
  submittedAt?: Date | null;
  publishedAt?: Date | null;
  reviewNote?: string | null;
}

export interface ListingRepository {
  create(listing: Listing): Promise<Listing>;
  findById(id: string): Promise<Listing | null>;
  /**
   * ALL of the owning supplier's listings, newest first. The supplier UI holds
   * the full set and filters/tallies by status client-side, so there is no
   * server-side status filter or pagination here.
   */
  findBySupplier(supplierId: string): Promise<Listing[]>;
  /** The dealer catalog: only PUBLICLY_VISIBLE_STATUSES listings. */
  findPublic(filters: PublicListingFilters): Promise<Page<Listing>>;
  /** The back-office list: every status, paginated. */
  findAll(filters: AdminListingFilters): Promise<Page<Listing>>;
  /**
   * How many listings sit in each status, for the dashboard and tab badges.
   * Pass a supplierId to scope the tally to one store's cars, which is what
   * the public storefront counts a store's sales with.
   */
  countByStatus(supplierId?: string): Promise<Record<string, number>>;
  update(id: string, patch: Partial<Listing>): Promise<Listing>;
  /**
   * Move a listing to a new state. `trail` writes the review stamps in the SAME
   * update, so a published listing can never be found live with no publish time
   * against it.
   */
  setStatus(
    id: string,
    status: ListingStatus,
    trail?: ListingReviewTrail,
  ): Promise<Listing>;
  delete(id: string): Promise<void>;
}
