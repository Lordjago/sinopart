import { BaseDomain } from './base.domain';

/**
 * One dealer's bookmark against one car.
 *
 * A join row and nothing more: saving carries no money, no hold on the car and
 * no promise to anyone. A saved car can be sold to someone else while it sits
 * on a watchlist, which is exactly why saving is not reserving.
 *
 * Uniqueness is on (userId, listingId), enforced by a compound index, so
 * saving twice is the same as saving once. That makes POST /saved idempotent
 * and a double-tap harmless.
 */
export class SavedListing extends BaseDomain {
  userId: string;
  listingId: string;
}
