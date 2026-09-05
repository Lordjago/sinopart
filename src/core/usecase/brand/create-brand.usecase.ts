/**
 * CreateBrandUseCase: add a manufacturer to the catalog.
 * ---------------------------------------------------------------------------
 * The duplicate check is the whole point of this use case. The unique index on
 * `name` is case-SENSITIVE, so it would happily accept "Toyota" and "toyota" as
 * two brands and fork the catalog tree underneath them. `findByName` compares
 * on the normalized form and refuses first.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { BRAND_REPOSITORY } from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { Brand } from '../../domain/entities/brand';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';

export interface CreateBrandInput {
  name: string;
  description?: string;
  logo?: string;
}

@Injectable()
export class CreateBrandUseCase extends BaseUseCase<CreateBrandInput, Brand> {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute(input: CreateBrandInput): Promise<Brand> {
    const name = input.name.trim();

    const existing = await this.brands.findByName(name);
    if (existing) {
      throw new ResourceAlreadyExistsError(
        `"${existing.name}" already exists.`,
      );
    }

    return this.brands.create({
      name,
      description: input.description?.trim() || undefined,
      logo: input.logo || undefined,
    });
  }
}
