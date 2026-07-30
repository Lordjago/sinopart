import type { Listing } from '../../core/domain/entities/listing';
import { ListingStatus } from '../../core/domain/entities/listing';

export class ListingMapper {
  static toDomain(document: any): Listing | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      supplierId: raw.supplierId?.toString(),
      status: raw.status,
      title: raw.title,
      vin: raw.vin ?? undefined,
      make: raw.make ?? undefined,
      model: raw.model ?? undefined,
      year: raw.year ?? undefined,
      trim: raw.trim ?? undefined,
      body: raw.body ?? undefined,
      exteriorColor: raw.exteriorColor ?? undefined,
      interiorColor: raw.interiorColor ?? undefined,
      fuel: raw.fuel ?? undefined,
      drivetrain: raw.drivetrain ?? undefined,
      batteryKwh: raw.batteryKwh ?? null,
      rangeKm: raw.rangeKm ?? null,
      mileageKm: raw.mileageKm ?? undefined,
      firstRegistered: raw.firstRegistered ?? null,
      seats: raw.seats ?? null,
      doors: raw.doors ?? null,
      features: Array.isArray(raw.features) ? raw.features : [],
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      fobPrice: raw.fobPrice ?? undefined,
      province: raw.province ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Listing;
  }

  static toPersistence(listing: Partial<Listing>): Record<string, any> {
    return {
      supplierId: listing.supplierId,
      status: listing.status ?? ListingStatus.DRAFT,
      title: listing.title,
      vin: listing.vin ?? null,
      make: listing.make ?? null,
      model: listing.model ?? null,
      year: listing.year ?? null,
      trim: listing.trim ?? null,
      body: listing.body ?? null,
      exteriorColor: listing.exteriorColor ?? null,
      interiorColor: listing.interiorColor ?? null,
      fuel: listing.fuel ?? null,
      drivetrain: listing.drivetrain ?? null,
      batteryKwh: listing.batteryKwh ?? null,
      rangeKm: listing.rangeKm ?? null,
      mileageKm: listing.mileageKm ?? null,
      firstRegistered: listing.firstRegistered ?? null,
      seats: listing.seats ?? null,
      doors: listing.doors ?? null,
      features: listing.features ?? [],
      photos: listing.photos ?? [],
      fobPrice: listing.fobPrice ?? null,
      province: listing.province ?? null,
    };
  }

  /**
   * A patch for `update`: only the keys actually present are written, so a
   * partial edit never nulls out fields the caller didn't touch. `supplierId`
   * and `status` are deliberately excluded — ownership and lifecycle move
   * through their own paths, not a field edit.
   */
  static toUpdate(patch: Partial<Listing>): Record<string, any> {
    const out: Record<string, any> = {};
    const fields: (keyof Listing)[] = [
      'title',
      'vin',
      'make',
      'model',
      'year',
      'trim',
      'body',
      'exteriorColor',
      'interiorColor',
      'fuel',
      'drivetrain',
      'batteryKwh',
      'rangeKm',
      'mileageKm',
      'firstRegistered',
      'seats',
      'doors',
      'features',
      'photos',
      'fobPrice',
      'province',
    ];
    for (const f of fields) {
      if (patch[f] !== undefined) out[f] = patch[f];
    }
    return out;
  }
}
