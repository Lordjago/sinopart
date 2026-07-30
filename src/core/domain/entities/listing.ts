import { BaseDomain } from './base.domain';

/**
 * A supplier's car listing and its lifecycle.
 *
 *   draft ──publish──▶ available ──(a buyer commits)──▶ reserved ─▶ pending ─▶ sold
 *     ▲                   │  ▲                                          │
 *     └───(stays draft)   └──┴─pause/relist─┐                          └▶ failed
 *                            paused ◀────────┘
 *
 * Only AVAILABLE listings are visible to dealers. draft/paused/failed are the
 * supplier's private states; reserved/pending/sold are driven by orders.
 */
export enum ListingStatus {
  DRAFT = 'draft',
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  PENDING = 'pending',
  SOLD = 'sold',
  FAILED = 'failed',
  PAUSED = 'paused',
}

/** A listing must carry at least this many photos before it can go live. */
export const LISTING_MIN_PHOTOS = 5;

/** States whose fields the supplier may still edit. */
export const EDITABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.AVAILABLE,
  ListingStatus.PAUSED,
]);

/** States a listing can be published (→ available) FROM. */
export const PUBLISHABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.PAUSED,
]);

/** States a supplier may delete/withdraw. Never once an order exists. */
export const DELETABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.PAUSED,
  ListingStatus.FAILED,
]);

export class Listing extends BaseDomain {
  /** Owning supplier's id. */
  supplierId: string;

  status: ListingStatus;

  /** Display title; derived from identity at create if the client sends none. */
  title: string;

  // Identity
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  body?: string;
  exteriorColor?: string;
  interiorColor?: string;

  // Powertrain
  fuel?: string;
  drivetrain?: string;
  batteryKwh?: number | null;
  rangeKm?: number | null;

  // Usage
  mileageKm?: number;
  firstRegistered?: string | null; // 'YYYY-MM-DD'

  // Practical
  seats?: number | null;
  doors?: number | null;
  features: string[];
  photos: string[]; // stored image URLs

  // Price & location (FOB in RMB)
  fobPrice?: number;
  province?: string;
}

/**
 * The fields a listing must have before it can be published. Returns the list of
 * missing/invalid field labels (empty ⇒ ready to publish). Lives in the domain
 * because "what makes a listing sellable" is a business rule, not an HTTP one.
 */
export function missingForPublish(listing: Partial<Listing>): string[] {
  const missing: string[] = [];
  const need = (ok: unknown, label: string) => {
    if (!ok) missing.push(label);
  };
  need(listing.vin, 'VIN');
  need(listing.make, 'Make');
  need(listing.model, 'Model');
  need(listing.year, 'Year');
  need(listing.body, 'Body');
  need(listing.fuel, 'Fuel type');
  need(listing.mileageKm != null, 'Mileage');
  need(
    typeof listing.fobPrice === 'number' && listing.fobPrice > 0,
    'FOB price',
  );
  need(listing.province, 'Yard province');
  need(
    (listing.photos?.length ?? 0) >= LISTING_MIN_PHOTOS,
    `At least ${LISTING_MIN_PHOTOS} photos`,
  );
  return missing;
}

/** A human title from the car's identity, used when the client sends none. */
export function deriveListingTitle(listing: Partial<Listing>): string {
  const parts = [listing.year, listing.make, listing.model, listing.trim]
    .filter(Boolean)
    .join(' ');
  return parts || 'Untitled listing';
}
