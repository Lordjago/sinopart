import type { Listing, ListingStatus } from '../../domain/entities/listing';
import type { Page } from '../../domain/value-object/page';

/** Filters for the PUBLIC dealer catalog (status is forced to available). */
export interface PublicListingFilters {
  make?: string;
  fuel?: string;
  body?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
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
  /** The dealer catalog — only AVAILABLE listings. */
  findPublic(filters: PublicListingFilters): Promise<Page<Listing>>;
  update(id: string, patch: Partial<Listing>): Promise<Listing>;
  setStatus(id: string, status: ListingStatus): Promise<Listing>;
  delete(id: string): Promise<void>;
}
