/**
 * GetVehicleUseCase: one vehicle by id.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { VEHICLE_REPOSITORY } from '../../injection.token';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import type { Vehicle } from '../../domain/entities/vehicle';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

@Injectable()
export class GetVehicleUseCase extends BaseUseCase<string, Vehicle> {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
  ) {
    super();
  }

  async execute(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findById(vehicleId);
    if (!vehicle) throw new ResourceNotFoundError('Vehicle not found.');
    return vehicle;
  }
}
