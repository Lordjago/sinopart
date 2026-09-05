/**
 * The facts every inspection email needs, gathered once.
 *
 * Three use cases (booked, answered, visit started) all have to turn an
 * Inspection into "who do we email, about which car". Rather than each one
 * hand-rolling the same two lookups, they share this.
 *
 * A plain function, not a service: it needs no state and no injection, so the
 * use cases keep passing their own repositories in and it stays trivially
 * testable with two object literals.
 */
import type { Inspection } from '../../domain/entities/inspection';
import type { Listing } from '../../domain/entities/listing';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { InspectionMailBase } from '../../mail/inspection.template';

interface Deps {
  users: UserRepository;
  listings: ListingRepository;
}

export interface InspectionMailFacts extends InspectionMailBase {
  supplierProvince?: string | null;
}

/**
 * Returns null when the email cannot be addressed or described — a deleted
 * buyer, or a listing that has since gone. Callers treat that as "no mail to
 * send", never as a failure: none of these emails is worth failing the action
 * that triggered it.
 *
 * `listing` can be passed in when the caller already loaded it, which
 * start-inspection does.
 */
export async function inspectionMailFacts(
  deps: Deps,
  inspection: Inspection,
  listing?: Listing | null,
): Promise<InspectionMailFacts | null> {
  const [buyer, car] = await Promise.all([
    deps.users.findById(inspection.buyerId),
    listing
      ? Promise.resolve(listing)
      : deps.listings.findById(inspection.listingId),
  ]);

  if (!buyer?.email || !car) return null;

  return {
    to: buyer.email,
    car: car.title,
    reference: inspection.reference,
    inspectionId: String(inspection._id),
    vin: car.vin ?? null,
    supplierProvince: car.province ?? null,
  };
}
