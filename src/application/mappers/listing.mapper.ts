import type {
  Listing,
  ProposedVehicle,
} from '../../core/domain/entities/listing';
import { ListingStatus } from '../../core/domain/entities/listing';
import { idOf } from './ref.util';

export class ListingMapper {
  /** The stored proposal, with its two optional catalog refs as plain ids. */
  static proposalToDomain(raw: any): ProposedVehicle | null {
    if (!raw) return null;
    return {
      brand: raw.brand,
      brandId: idOf(raw.brandId) ?? null,
      series: raw.series,
      seriesId: idOf(raw.seriesId) ?? null,
      year: raw.year,
      variant: raw.variant,
      fuelType: raw.fuelType,
      transmission: raw.transmission,
      note: raw.note ?? null,
    };
  }

  static toDomain(document: any): Listing | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      supplierId: raw.supplierId?.toString(),
      status: raw.status,
      title: raw.title,
      vehicleId: idOf(raw.vehicleId),
      seriesId: idOf(raw.seriesId),
      brandId: idOf(raw.brandId),
      proposedVehicle: ListingMapper.proposalToDomain(raw.proposedVehicle),
      vin: raw.vin ?? undefined,
      body: raw.body ?? undefined,
      exteriorColor: raw.exteriorColor ?? undefined,
      interiorColor: raw.interiorColor ?? undefined,
      drivetrain: raw.drivetrain ?? undefined,
      batteryKwh: raw.batteryKwh ?? null,
      rangeKm: raw.rangeKm ?? null,
      mileageKm: raw.mileageKm ?? undefined,
      firstRegistered: raw.firstRegistered ?? null,
      seats: raw.seats ?? null,
      doors: raw.doors ?? null,
      features: Array.isArray(raw.features) ? raw.features : [],
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      videos: Array.isArray(raw.videos) ? raw.videos : [],
      fobPrice: raw.fobPrice ?? undefined,
      province: raw.province ?? undefined,
      submittedAt: raw.submittedAt ?? null,
      publishedAt: raw.publishedAt ?? null,
      reviewNote: raw.reviewNote ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Listing;
  }

  static toPersistence(listing: Partial<Listing>): Record<string, any> {
    return {
      supplierId: listing.supplierId,
      status: listing.status ?? ListingStatus.DRAFT,
      title: listing.title,
      vehicleId: listing.vehicleId ?? null,
      seriesId: listing.seriesId ?? null,
      brandId: listing.brandId ?? null,
      proposedVehicle: listing.proposedVehicle ?? null,
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
      submittedAt: listing.submittedAt ?? null,
      publishedAt: listing.publishedAt ?? null,
      reviewNote: listing.reviewNote ?? null,
    };
  }

  /**
   * A patch for `update`: only the keys actually present are written, so a
   * partial edit never nulls out fields the caller didn't touch. `supplierId`
   * and `status` are deliberately excluded. Ownership and lifecycle move
   * through their own paths, not a field edit.
   *
   * `seriesId`/`brandId` ARE writable here, but only the update use case sets
   * them, and only alongside a new `vehicleId`, they are copies of the
   * vehicle's parents, never something a client picks.
   */
  static toUpdate(patch: Partial<Listing>): Record<string, any> {
    const out: Record<string, any> = {};
    const fields: (keyof Listing)[] = [
      'title',
      'vehicleId',
      'seriesId',
      'brandId',
      'proposedVehicle',
      'vin',
      'body',
      'exteriorColor',
      'interiorColor',
      'drivetrain',
      'batteryKwh',
      'rangeKm',
      'mileageKm',
      'firstRegistered',
      'seats',
      'doors',
      'features',
      'photos',
      'videos',
      'fobPrice',
      'province',
    ];
    for (const f of fields) {
      if (patch[f] !== undefined) out[f] = patch[f];
    }
    return out;
  }
}
