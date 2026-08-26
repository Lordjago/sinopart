/**
 * UpdateVehicleUseCase: edit a configuration.
 * ---------------------------------------------------------------------------
 * Every editable field is part of the vehicle's natural key, so ANY edit can
 * collide with an existing row. The check runs against the MERGED vehicle (old
 * values plus the patch), not the patch alone. Changing only the transmission
 * still has to be compared against a full key.
 *
 * `seriesId` is not editable: a configuration moved to another series is a
 * different car, and re-parenting it silently would be a data-repair operation.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { VEHICLE_REPOSITORY } from '../../injection.token';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import type { Vehicle } from '../../domain/entities/vehicle';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';

export interface UpdateVehicleInput {
  vehicleId: string;
  year?: number;
  fuelType?: string;
  transmission?: string;
  variant?: number;
}

@Injectable()
export class UpdateVehicleUseCase extends BaseUseCase<
  UpdateVehicleInput,
  Vehicle
> {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
  ) {
    super();
  }

  async execute({ vehicleId, ...patch }: UpdateVehicleInput): Promise<Vehicle> {
    const existing = await this.vehicles.findById(vehicleId);
    if (!existing) throw new ResourceNotFoundError('Vehicle not found.');

    if (patch.fuelType !== undefined) patch.fuelType = patch.fuelType.trim();
    if (patch.transmission !== undefined) {
      patch.transmission = patch.transmission.trim();
    }
    const merged: Vehicle = { ...existing, ...patch };
    const clash = await this.vehicles.findByKey(merged);
    if (clash && clash._id !== existing._id) {
      throw new ResourceAlreadyExistsError(
        `This series already has a ${clash.year} ${clash.variant} ${clash.fuelType} ${clash.transmission}.`,
      );
    }

    return this.vehicles.update(vehicleId, patch);
  }
}
