/**
 * ListBrandsUseCase: every brand, A→Z, with an optional type-ahead filter.
 * Brands are public reference data: no auth, no pagination, no filtering by
 * anything private, because there is nothing private on a brand.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { BRAND_REPOSITORY } from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { Brand } from '../../domain/entities/brand';

export interface ListBrandsInput {
  search?: string;
}

@Injectable()
export class ListBrandsUseCase extends BaseUseCase<ListBrandsInput, Brand[]> {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute(input: ListBrandsInput = {}): Promise<Brand[]> {
    return this.brands.findAll(input.search?.trim() || undefined);
  }
}
