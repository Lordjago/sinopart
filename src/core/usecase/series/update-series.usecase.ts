/**
 * UpdateSeriesUseCase: rename a series.
 * ---------------------------------------------------------------------------
 * Only the name is editable. `brandId` is deliberately not: re-parenting a
 * series would silently move every vehicle under it to another manufacturer,
 * which is a data-repair operation, not an edit.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SERIES_REPOSITORY } from '../../injection.token';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { Series } from '../../domain/entities/series';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';

export interface UpdateSeriesInput {
  seriesId: string;
  name?: string;
}

@Injectable()
export class UpdateSeriesUseCase extends BaseUseCase<
  UpdateSeriesInput,
  Series
> {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
  ) {
    super();
  }

  async execute({ seriesId, ...patch }: UpdateSeriesInput): Promise<Series> {
    const existing = await this.series.findById(seriesId);
    if (!existing) throw new ResourceNotFoundError('Series not found.');

    if (patch.name !== undefined) {
      patch.name = patch.name.trim();
      const clash = await this.series.findByName(existing.brandId, patch.name);
      if (clash && clash._id !== existing._id) {
        throw new ResourceAlreadyExistsError(
          `That brand already has a "${clash.name}" series.`,
        );
      }
    }

    return this.series.update(seriesId, patch);
  }
}
