/**
 * DeleteVehicleUseCase: remove one configuration.
 * The leaf of the catalog tree: nothing hangs off a vehicle, so there is no
 * child guard here, unlike brand and series.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { VEHICLE_REPOSITORY } from '../../injection.token';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

@Injectable()
export class DeleteVehicleUseCase extends BaseUseCase<string, void> {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
  ) {
    super();
  }

  async execute(vehicleId: string): Promise<void> {
    const existing = await this.vehicles.findById(vehicleId);
    if (!existing) throw new ResourceNotFoundError('Vehicle not found.');
    await this.vehicles.delete(vehicleId);
  }
}
