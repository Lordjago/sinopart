/**
 * DeleteBrandUseCase: remove a brand from the catalog.
 * ---------------------------------------------------------------------------
 * Refused while series still hang off it. Mongo has no foreign keys, so nothing
 * below would stop the delete. Every series under the brand would simply keep
 * a `brandId` pointing at a document that no longer exists, and with it every
 * vehicle underneath. Deleting the tree bottom-up is the admin's call.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { BRAND_REPOSITORY, SERIES_REPOSITORY } from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

@Injectable()
export class DeleteBrandUseCase extends BaseUseCase<string, void> {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
  ) {
    super();
  }

  async execute(brandId: string): Promise<void> {
    const existing = await this.brands.findById(brandId);
    if (!existing) throw new ResourceNotFoundError('Brand not found.');

    const series = await this.series.countByBrand(brandId);
    if (series > 0) {
      throw new ValidationError(
        `"${existing.name}" still has ${series} series. Remove them first.`,
      );
    }

    await this.brands.delete(brandId);
  }
}
