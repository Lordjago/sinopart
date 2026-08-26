import type { Vehicle } from '../../domain/entities/vehicle';
import type { Page } from '../../domain/value-object/page';

export interface VehicleFilters {
  /** Restrict to one series. */
  seriesId?: string;
  /**
   * Restrict to several series at once. A vehicle stores no brandId, so
   * "every vehicle of this brand" is expressed by resolving the brand's series
   * first and passing their ids here.
   */
  seriesIds?: string[];
  year?: number;
  fuelType?: string;
  transmission?: string;
  page?: number;
  limit?: number;
}

/** The natural key of a vehicle. See the compound unique index. */
export interface VehicleKey {
  seriesId: string;
  year: number;
  variant: number;
  fuelType: string;
  transmission: string;
}

export interface VehicleRepository {
  create(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  /**
   * The one vehicle matching this exact configuration, if it exists, the
   * duplicate check create/update runs before writing.
   */
  findByKey(key: VehicleKey): Promise<Vehicle | null>;
  /**
   * Matching vehicles, newest model year first. Paginated: unlike brands and
   * series, the vehicle table grows without a natural ceiling.
   */
  findAll(filters: VehicleFilters): Promise<Page<Vehicle>>;
  /**
   * How many vehicles hang off a series. The series-delete guard reads this.
   */
  countBySeries(seriesId: string): Promise<number>;
  update(id: string, patch: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
}
