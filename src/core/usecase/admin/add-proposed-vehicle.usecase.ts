/**
 * AddProposedVehicleUseCase: turn a supplier's typed car into catalog entries.
 * (POST /admin/listings/:id/catalog-entry)
 * ---------------------------------------------------------------------------
 * A supplier who cannot find their car in the catalog types it instead, and the
 * listing carries that text as `proposedVehicle`. This is the admin's side of
 * that: create whatever is missing, brand → series → vehicle, and hand back the
 * vehicle so the panel can tell the store exactly what to pick.
 *
 * Find-or-create at every level, for two reasons. Two reviewers may open the
 * same queue, and a proposal may name a brand that already exists while only
 * the series below it is new. Re-running this is therefore safe and returns the
 * same vehicle rather than failing on the unique index.
 *
 * It deliberately does NOT touch the listing. The supplier picks the new entry
 * themselves and resubmits, which is what keeps the car's identity something
 * the store attested to rather than something the back office assumed.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  BRAND_REPOSITORY,
  LISTING_REPOSITORY,
  SERIES_REPOSITORY,
  VEHICLE_REPOSITORY,
} from '../../injection.token';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import type { Brand } from '../../domain/entities/brand';
import type { Series } from '../../domain/entities/series';
import type { Vehicle } from '../../domain/entities/vehicle';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

export interface AddProposedVehicleResult {
  brand: Brand;
  series: Series;
  vehicle: Vehicle;
  /** Which levels this call actually created, for the confirmation message. */
  created: string[];
}

@Injectable()
export class AddProposedVehicleUseCase extends BaseUseCase<
  string,
  AddProposedVehicleResult
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
  ) {
    super();
  }

  async execute(listingId: string): Promise<AddProposedVehicleResult> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');

    const proposed = listing.proposedVehicle;
    if (!proposed) {
      throw new ValidationError(
        'This listing has no proposed car. Its vehicle is already in the catalog.',
      );
    }

    const created: string[] = [];

    // Brand: by id when the supplier picked one, otherwise by name so two
    // proposals for the same new brand converge on one entry.
    let brand = proposed.brandId
      ? await this.brands.findById(proposed.brandId)
      : await this.brands.findByName(proposed.brand);
    if (!brand) {
      brand = await this.brands.create({ name: proposed.brand.trim() } as Brand);
      created.push('brand');
    }

    let series = proposed.seriesId
      ? await this.series.findById(proposed.seriesId)
      : await this.series.findByName(brand._id!, proposed.series);
    if (!series) {
      series = await this.series.create({
        brandId: brand._id!,
        name: proposed.series.trim(),
      } as Series);
      created.push('series');
    }

    const key = {
      seriesId: series._id!,
      year: proposed.year,
      variant: proposed.variant,
      fuelType: proposed.fuelType.trim(),
      transmission: proposed.transmission.trim(),
    };
    let vehicle = await this.vehicles.findByKey(key);
    if (!vehicle) {
      vehicle = await this.vehicles.create(key as Vehicle);
      created.push('vehicle');
    }

    return { brand, series, vehicle, created };
  }
}
