import type { Vehicle } from '../../core/domain/entities/vehicle';
import { idOf } from './ref.util';

export class VehicleMapper {
  static toDomain(document: any): Vehicle | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      seriesId: idOf(raw.seriesId),
      year: raw.year,
      fuelType: raw.fuelType,
      transmission: raw.transmission,
      variant: raw.variant,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Vehicle;
  }

  static toPersistence(vehicle: Partial<Vehicle>): Record<string, any> {
    return {
      seriesId: vehicle.seriesId,
      year: vehicle.year,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      variant: vehicle.variant,
    };
  }

  /**
   * A patch for `update`: only the keys actually present are written.
   * `seriesId` is excluded. A vehicle cannot be moved between series, since
   * that is really a different car.
   */
  static toUpdate(patch: Partial<Vehicle>): Record<string, any> {
    const out: Record<string, any> = {};
    const fields: (keyof Vehicle)[] = [
      'year',
      'fuelType',
      'transmission',
      'variant',
    ];
    for (const f of fields) {
      if (patch[f] !== undefined) out[f] = patch[f];
    }
    return out;
  }
}
