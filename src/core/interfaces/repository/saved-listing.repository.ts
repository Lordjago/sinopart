import type { SavedListing } from '../../domain/entities/saved-listing';

export interface SavedListingRepository {
  /**
   * Save, or do nothing if it is already saved. An upsert rather than an
   * insert, so a double-tap cannot 11000 on the unique index.
   */
  save(userId: string, listingId: string): Promise<SavedListing>;
  remove(userId: string, listingId: string): Promise<void>;
  /** One dealer's whole watchlist, newest save first. */
  findByUser(userId: string): Promise<SavedListing[]>;
  /**
   * The subset of `listingIds` this dealer has saved. Lets a screen showing
   * many cars fill in every bookmark state with one query instead of one per
   * card.
   */
  findSavedIds(userId: string, listingIds: string[]): Promise<string[]>;
}
