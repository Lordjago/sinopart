/**
 * ListVehiclesUseCase: the vehicle list, filtered and paginated.
 * ---------------------------------------------------------------------------
 * `brandId` is the interesting filter. A vehicle stores no brandId, it reaches
 * its brand through its series. So filtering by brand means resolving that
 * brand's series first and matching on their ids. Two round trips, but one
 * source of truth for which brand a car belongs to.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SERIES_REPOSITORY, VEHICLE_REPOSITORY } from '../../injection.token';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type {
  VehicleFilters,
  VehicleRepository,
} from '../../interfaces/repository/vehicle.repository';
import type { Vehicle } from '../../domain/entities/vehicle';
import type { Page } from '../../domain/value-object/page';

export interface ListVehiclesInput extends VehicleFilters {
  brandId?: string;
}

@Injectable()
export class ListVehiclesUseCase extends BaseUseCase<
  ListVehiclesInput,
  Page<Vehicle>
> {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
  ) {
    super();
  }

  async execute(input: ListVehiclesInput = {}): Promise<Page<Vehicle>> {
    const { brandId, ...filters } = input;

    // A brand filter with no series resolves to an empty id list, which the
    // repository reads as "match nothing", not as "no filter".
    if (brandId && !filters.seriesId) {
      const series = await this.series.findAll({ brandId });
      filters.seriesIds = series.map((s) => s._id!);
    }

    return this.vehicles.findAll(filters);
  }
}
