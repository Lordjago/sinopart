/**
 * What a listing looks like to an unauthenticated dealer.
 *
 * Both public endpoints used to return the raw domain Listing, which put the
 * back-office trail on an open route: `reviewNote` is the admin's private
 * reason for bouncing a car back to its store, and `proposedVehicle` is a
 * store's unreviewed guess at a catalog entry. Neither is a buyer's business.
 *
 * So this is an ALLOW-LIST, not a deny-list. A field added to the entity later
 * stays private until someone puts it here on purpose, which is the right
 * default for the only listing route with no auth in front of it.
 *
 * `status` IS public, deliberately: it is what tells the dealer catalog to flag
 * a reserved car as on hold instead of offering an inspection it cannot sell.
 */
import type { Listing } from '../../domain/entities/listing';
import type { ListingStatus } from '../../domain/entities/listing';
import {
  landedPrice,
  DEFAULT_RATES,
  type LandedPrice,
  type PricingRates,
} from '../../domain/value-object/landed-price';

export interface PublicListingView {
  _id: string;
  status: ListingStatus;
  title: string;

  // Catalog identity. The dealer app resolves these ids against the brand,
  // series and vehicle reference data it already holds.
  vehicleId: string | null;
  seriesId: string | null;
  brandId: string | null;
  supplierId: string;

  vin: string | null;
  body: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  drivetrain: string | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  mileageKm: number | null;
  firstRegistered: string | null;
  seats: number | null;
  doors: number | null;
  features: string[];
  photos: string[];
  videos: string[];
  fobPrice: number | null;
  province: string | null;

  /**
   * The landed cost, computed server-side from the operator-set rates.
   *
   * The dealer app used to work this out itself from its own copy of the FX
   * rate, freight and duty. That meant changing a rate in the config screen
   * moved the checkout total while the catalog card kept quoting the old one.
   * The margins stay server-side too: the amounts are customer-facing, the
   * RATES behind them are not.
   */
  pricing: LandedPrice;

  /** Sort key for "newest first". Falls back to creation for legacy rows. */
  publishedAt: Date | null;
  createdAt?: Date;
}

export function toPublicListingView(
  listing: Listing,
  rates: PricingRates = DEFAULT_RATES,
): PublicListingView {
  return {
    _id: listing._id!,
    status: listing.status,
    title: listing.title,

    vehicleId: listing.vehicleId ?? null,
    seriesId: listing.seriesId ?? null,
    brandId: listing.brandId ?? null,
    supplierId: listing.supplierId,

    vin: listing.vin ?? null,
    body: listing.body ?? null,
    exteriorColor: listing.exteriorColor ?? null,
    interiorColor: listing.interiorColor ?? null,
    drivetrain: listing.drivetrain ?? null,
    batteryKwh: listing.batteryKwh ?? null,
    rangeKm: listing.rangeKm ?? null,
    mileageKm: listing.mileageKm ?? null,
    firstRegistered: listing.firstRegistered ?? null,
    seats: listing.seats ?? null,
    doors: listing.doors ?? null,
    features: listing.features ?? [],
    photos: listing.photos ?? [],
    videos: listing.videos ?? [],
    fobPrice: listing.fobPrice ?? null,
    province: listing.province ?? null,

    pricing: landedPrice(listing.fobPrice, rates),
    publishedAt: listing.publishedAt ?? null,
    createdAt: listing.createdAt,
  };
}
