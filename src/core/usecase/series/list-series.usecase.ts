/**
 * ListSeriesUseCase: the series list, optionally narrowed to one brand.
 * Public reference data, like brands.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SERIES_REPOSITORY } from '../../injection.token';
import type {
  SeriesFilters,
  SeriesRepository,
} from '../../interfaces/repository/series.repository';
import type { Series } from '../../domain/entities/series';

@Injectable()
export class ListSeriesUseCase extends BaseUseCase<SeriesFilters, Series[]> {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
  ) {
    super();
  }

  async execute(filters: SeriesFilters = {}): Promise<Series[]> {
    return this.series.findAll({
      brandId: filters.brandId,
      search: filters.search?.trim() || undefined,
    });
  }
}
