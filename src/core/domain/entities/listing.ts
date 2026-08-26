import { BaseDomain } from './base.domain';

/**
 * A supplier's car listing and its lifecycle.
 *
 *   draft ──submit──▶ submitted ──admin publishes──▶ available ──(a buyer
 *     ▲                    │                            │  ▲      commits)──▶
 *     └──admin returns ────┘                            └──┴─pause/relist─┐
 *                                          reserved ─▶ pending ─▶ sold    │
 *                                              │                paused ◀──┘
 *                                              └▶ failed
 *
 * The supplier can only get a listing as far as SUBMITTED: going live is an
 * admin decision, so nothing reaches dealers without back-office review. Only
 * AVAILABLE and RESERVED listings are visible to dealers (a reserved one shows
 * as on hold); draft/submitted/paused/failed are private; reserved/pending/sold
 * are driven by orders.
 */
export enum ListingStatus {
  DRAFT = 'draft',
  /** Supplier is done and has sent it for review. Not visible to dealers. */
  SUBMITTED = 'submitted',
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  PENDING = 'pending',
  SOLD = 'sold',
  FAILED = 'failed',
  PAUSED = 'paused',
}

/** A listing must carry at least this many photos before it can go live. */
export const LISTING_MIN_PHOTOS = 5;

/** States whose fields the supplier may still edit. A submitted listing stays
 *  editable so a store can answer a reviewer's question without withdrawing.
 *
 *  AVAILABLE is excluded: a live listing is in front of buyers, so its price,
 *  mileage and photos are frozen. Pausing takes it off the market and makes it
 *  editable again. */
export const EDITABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.SUBMITTED,
  ListingStatus.PAUSED,
]);

/**
 * States a dealer may see in the public catalog.
 *
 * RESERVED is here, and that is the whole point: a reserved car is one another
 * dealer has paid to inspect, and it is NOT a terminal state. A declined visit
 * puts it straight back to AVAILABLE. Hiding it would mean stock vanishing from
 * the catalog and silently reappearing days later, so it stays visible and the
 * card says why it cannot be bought.
 *
 * Visibility is not permission: paying is gated separately, by
 * StartInspectionUseCase, which accepts AVAILABLE and nothing else.
 */
export const PUBLICLY_VISIBLE_STATUSES: readonly ListingStatus[] = [
  ListingStatus.AVAILABLE,
  ListingStatus.RESERVED,
];

/** States a supplier may SUBMIT for review from. */
export const SUBMITTABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.PAUSED,
]);

/** States an admin can publish (→ available) FROM. Includes DRAFT and PAUSED so
 *  a relist, or a listing an admin is happy to wave through, needs no detour. */
export const PUBLISHABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.SUBMITTED,
  ListingStatus.PAUSED,
]);

/** States an admin may bounce back to the supplier as a draft. */
export const RETURNABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.SUBMITTED,
  ListingStatus.AVAILABLE,
  ListingStatus.PAUSED,
]);

/** States a supplier may delete/withdraw. Never once an order exists. */
export const DELETABLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  ListingStatus.DRAFT,
  ListingStatus.SUBMITTED,
  ListingStatus.PAUSED,
  ListingStatus.FAILED,
]);

/**
 * A car the supplier says they have but the catalog does not know about yet.
 *
 * Every level is carried, including the ones that already exist, so the admin
 * reads the whole car in one place instead of piecing it together from a
 * half-filled listing. `brandId`/`seriesId` are set when the supplier picked
 * those levels from the catalog and only typed the ones below.
 */
export interface ProposedVehicle {
  brand: string;
  brandId?: string | null;
  series: string;
  seriesId?: string | null;
  year: number;
  variant: number;
  fuelType: string;
  transmission: string;
  /** Anything the supplier wants the reviewer to know about the car. */
  note?: string | null;
}

/** Which levels of a proposal are new to the catalog. */
export function proposalGaps(proposal: ProposedVehicle): string[] {
  const gaps: string[] = [];
  if (!proposal.brandId) gaps.push('brand');
  if (!proposal.seriesId) gaps.push('series');
  gaps.push('vehicle');
  return gaps;
}

export class Listing extends BaseDomain {
  /** Owning supplier's id. */
  supplierId: string;

  status: ListingStatus;

  /** Display title; derived from the catalog at create if the client sends none. */
  title: string;

  // Identity: which car this is, from the catalog.
  /**
   * The catalog configuration being sold: brand, series, year, variant, fuel
   * and transmission all come from here, so the listing no longer carries them
   * as free text.
   */
  vehicleId?: string;
  /**
   * The vehicle's series and brand, copied at write time so the dealer catalog
   * can filter by make with one indexed query instead of walking the tree.
   * Safe to copy because a vehicle can never change series, nor a series its
   * brand. Both are rejected by their update use cases.
   */
  seriesId?: string;
  brandId?: string;

  /**
   * What the supplier typed when the car they are selling is not in the catalog
   * yet. Set only while `vehicleId` is null: the two are alternatives, never
   * both, and picking a real vehicle clears this.
   *
   * A listing carrying one of these can be SUBMITTED but never published. It
   * reaches the review queue precisely so an admin can add the entry to the
   * catalog and send the car back for the supplier to re-pick.
   */
  proposedVehicle?: ProposedVehicle | null;

  vin?: string;
  body?: string;
  exteriorColor?: string;
  interiorColor?: string;

  // Powertrain: what the catalog does not describe.
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
  /**
   * Walkaround clips, as stored URLs. Optional: a still gallery is the
   * publishing requirement, video is the supplier going further. A car that
   * sounds right on a cold start tells a dealer something no photo can.
   */
  videos: string[];

  // Price & location (FOB in RMB)
  fobPrice?: number;
  province?: string;

  // Back-office review trail. These are set by the lifecycle transitions, never
  // by a field edit, which is why they are absent from ListingMapper.toUpdate.
  /** When the supplier last sent it for review. */
  submittedAt?: Date | null;
  /** When an admin last took it live. */
  publishedAt?: Date | null;
  /** Why an admin sent it back. The only explanation the supplier ever gets. */
  reviewNote?: string | null;
}

/** Everything a listing needs apart from the question of which car it is. */
function missingApartFromTheCar(listing: Partial<Listing>): string[] {
  const missing: string[] = [];
  const need = (ok: unknown, label: string) => {
    if (!ok) missing.push(label);
  };
  need(listing.vin, 'VIN');
  need(listing.body, 'Body');
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

/**
 * What a supplier must fill in before they can send a car for review.
 *
 * Looser than the publish rule in exactly one way: the car may be identified by
 * a catalog `vehicleId` OR by a typed `proposedVehicle`. That is the whole point
 * of the proposal. A supplier holding a car the catalog has never heard of has
 * to be able to reach the queue, because the queue is where someone can add it.
 */
export function missingForSubmit(listing: Partial<Listing>): string[] {
  const missing = missingApartFromTheCar(listing);
  if (!listing.vehicleId && !listing.proposedVehicle) {
    missing.unshift('Vehicle');
  }
  return missing;
}

/**
 * The fields a listing must have before it can go live. Returns the list of
 * missing/invalid field labels (empty ⇒ ready to publish). Lives in the domain
 * because "what makes a listing sellable" is a business rule, not an HTTP one.
 *
 * A typed proposal does NOT satisfy this. Dealers filter and search on the
 * catalog ids, so a listing that only has free text would be invisible to every
 * query that matters. The entry has to become a real catalog vehicle first.
 */
export function missingForPublish(listing: Partial<Listing>): string[] {
  const missing = missingApartFromTheCar(listing);
  if (!listing.vehicleId) {
    missing.unshift(
      listing.proposedVehicle
        ? 'Vehicle (the supplier proposed one that is not in the catalog yet)'
        : 'Vehicle',
    );
  }
  return missing;
}

/**
 * A human title from the catalog entry, used when the client sends none,
 * e.g. "2019 Toyota Camry 2.5". The identity now lives across three catalog
 * documents, so the caller resolves them and passes the labels in; storing the
 * result keeps the dealer catalog readable without joining on every read.
 */
export interface ListingTitleParts {
  year?: number;
  brand?: string;
  series?: string;
  variant?: number;
}

export function deriveListingTitle(parts: ListingTitleParts): string {
  const title = [parts.year, parts.brand, parts.series, parts.variant]
    .filter((part) => part !== undefined && part !== null && part !== '')
    .join(' ');
  return title || 'Untitled listing';
}
