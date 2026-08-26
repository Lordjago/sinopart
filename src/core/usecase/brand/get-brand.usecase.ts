/**
 * GetBrandUseCase: one brand by id.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { BRAND_REPOSITORY } from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { Brand } from '../../domain/entities/brand';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

@Injectable()
export class GetBrandUseCase extends BaseUseCase<string, Brand> {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute(brandId: string): Promise<Brand> {
    const brand = await this.brands.findById(brandId);
    if (!brand) throw new ResourceNotFoundError('Brand not found.');
    return brand;
  }
}
