/**
 * CreateSeriesUseCase: add a model line under a brand.
 * ---------------------------------------------------------------------------
 * Two gates: the brand must exist (a series with a dangling `brandId` is
 * unreachable from the catalog tree), and the name must be free WITHIN that
 * brand. The `{ brandId, name }` unique index is case-sensitive, so it would
 * let "Camry" and "camry" both sit under Toyota.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { BRAND_REPOSITORY, SERIES_REPOSITORY } from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { Series } from '../../domain/entities/series';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';

export interface CreateSeriesInput {
  brandId: string;
  name: string;
}

@Injectable()
export class CreateSeriesUseCase extends BaseUseCase<
  CreateSeriesInput,
  Series
> {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute(input: CreateSeriesInput): Promise<Series> {
    const name = input.name.trim();

    const brand = await this.brands.findById(input.brandId);
    if (!brand) throw new ResourceNotFoundError('Brand not found.');

    const clash = await this.series.findByName(input.brandId, name);
    if (clash) {
      throw new ResourceAlreadyExistsError(
        `${brand.name} already has a "${clash.name}" series.`,
      );
    }

    return this.series.create({ brandId: input.brandId, name });
  }
}
