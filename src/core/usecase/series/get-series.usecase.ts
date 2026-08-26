/**
 * GetSeriesUseCase: one series by id.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SERIES_REPOSITORY } from '../../injection.token';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { Series } from '../../domain/entities/series';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

@Injectable()
export class GetSeriesUseCase extends BaseUseCase<string, Series> {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
  ) {
    super();
  }

  async execute(seriesId: string): Promise<Series> {
    const found = await this.series.findById(seriesId);
    if (!found) throw new ResourceNotFoundError('Series not found.');
    return found;
  }
}
