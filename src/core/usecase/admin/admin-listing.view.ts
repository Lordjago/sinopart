/**
 * Turning a Listing into the row the back office renders.
 * ---------------------------------------------------------------------------
 * Shared by the listings table (every store) and the user page (one store's
 * whole inventory) so both describe a car the same way, including what is
 * still missing before it could go live, which is computed with the same domain
 * rule the publish transition enforces rather than re-derived per screen.
 */
import { missingForPublish, type Listing } from '../../domain/entities/listing';
import type { Supplier } from '../../domain/entities/supplier';
import type { AdminListingView } from './admin.views';

export function toAdminListingView(
  listing: Listing,
  store?: Supplier,
): AdminListingView {
  return {
    id: listing._id!,
    status: listing.status,
    title: listing.title,
    vin: listing.vin ?? null,
    body: listing.body ?? null,
    mileageKm: listing.mileageKm ?? null,
    fobPrice: listing.fobPrice ?? null,
    province: listing.province ?? null,
    photos: listing.photos ?? [],
    supplierId: listing.supplierId,
    // A deleted store leaves its listings behind; say so rather than render an
    // empty cell that reads as a loading bug.
    storeName: store?.storeName ?? 'Unknown store',
    supplierStatus: store?.accountStatus ?? null,
    missingForPublish: missingForPublish(listing),
    proposedVehicle: listing.proposedVehicle ?? null,
    reviewNote: listing.reviewNote ?? null,
    submittedAt: listing.submittedAt ?? null,
    publishedAt: listing.publishedAt ?? null,
    createdAt: listing.createdAt,
  };
}
