/**
 * CreateVehicleUseCase: add one configuration under a series.
 * ---------------------------------------------------------------------------
 * Two gates: the series must exist, and the configuration must be new. The
 * second matters most. The unique index covers the five key fields verbatim,
 * so "Petrol" and "petrol" would slip past it and give the catalog two entries
 * for one car.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SERIES_REPOSITORY, VEHICLE_REPOSITORY } from '../../injection.token';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import type { Vehicle } from '../../domain/entities/vehicle';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';

export interface CreateVehicleInput {
  seriesId: string;
  year: number;
  fuelType: string;
  transmission: string;
  variant: number;
}

@Injectable()
export class CreateVehicleUseCase extends BaseUseCase<
  CreateVehicleInput,
  Vehicle
> {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
  ) {
    super();
  }

  async execute(input: CreateVehicleInput): Promise<Vehicle> {
    const series = await this.series.findById(input.seriesId);
    if (!series) throw new ResourceNotFoundError('Series not found.');

    const vehicle: Vehicle = {
      seriesId: input.seriesId,
      year: input.year,
      fuelType: input.fuelType.trim(),
      transmission: input.transmission.trim(),
      variant: input.variant,
    };

    const clash = await this.vehicles.findByKey(vehicle);
    if (clash) {
      throw new ResourceAlreadyExistsError(
        `${series.name} already has a ${clash.year} ${clash.variant} ${clash.fuelType} ${clash.transmission}.`,
      );
    }

    return this.vehicles.create(vehicle);
  }
}
