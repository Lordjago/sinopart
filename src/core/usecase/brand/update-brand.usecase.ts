/**
 * UpdateBrandUseCase: edit a brand's name, description or logo.
 * ---------------------------------------------------------------------------
 * A rename runs the same case-insensitive duplicate check as create, minus the
 * brand itself. Otherwise re-saving "Toyota" as "Toyota" would collide with
 * its own record, and re-casing it to "TOYOTA" would be rejected.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { BRAND_REPOSITORY } from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { Brand } from '../../domain/entities/brand';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';

export interface UpdateBrandInput {
  brandId: string;
  name?: string;
  description?: string;
  logo?: string;
}

@Injectable()
export class UpdateBrandUseCase extends BaseUseCase<UpdateBrandInput, Brand> {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute({ brandId, ...patch }: UpdateBrandInput): Promise<Brand> {
    const existing = await this.brands.findById(brandId);
    if (!existing) throw new ResourceNotFoundError('Brand not found.');

    if (patch.name !== undefined) {
      patch.name = patch.name.trim();
      const clash = await this.brands.findByName(patch.name);
      if (clash && clash._id !== existing._id) {
        throw new ResourceAlreadyExistsError(`"${clash.name}" already exists.`);
      }
    }

    return this.brands.update(brandId, patch);
  }
}
