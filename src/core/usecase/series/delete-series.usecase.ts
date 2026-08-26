/**
 * DeleteSeriesUseCase: remove a model line.
 * ---------------------------------------------------------------------------
 * Refused while vehicles still hang off it. Deleting anyway would leave every
 * one of them with a `seriesId` pointing at nothing: invisible to any
 * brand/series drill-down, but still matching a bare vehicle query. Emptying
 * the series first is the admin's decision to make explicitly.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SERIES_REPOSITORY, VEHICLE_REPOSITORY } from '../../injection.token';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

@Injectable()
export class DeleteSeriesUseCase extends BaseUseCase<string, void> {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
  ) {
    super();
  }

  async execute(seriesId: string): Promise<void> {
    const existing = await this.series.findById(seriesId);
    if (!existing) throw new ResourceNotFoundError('Series not found.');

    const vehicles = await this.vehicles.countBySeries(seriesId);
    if (vehicles > 0) {
      throw new ValidationError(
        `"${existing.name}" still has ${vehicles} vehicle(s). Remove them first.`,
      );
    }

    await this.series.delete(seriesId);
  }
}
