/**
 * CreateListingUseCase: save a new listing as a draft, or send it for review.
 * ---------------------------------------------------------------------------
 * The car's identity now comes from the CATALOG: the client sends a `vehicleId`
 * and the make/series/year/variant follow from it, so a listing can no longer
 * describe a car that does not exist. The vehicle's series and brand are copied
 * onto the listing here (safe, because neither link can ever be re-pointed),
 * which is what lets the dealer catalog filter by make in one query.
 *
 * The `publish` flag no longer publishes. Going live is an admin decision, so
 * the most this can do is land the listing at SUBMITTED, in the review queue.
 * The gate lives HERE, not just in the UI: a store may always save a draft, but
 * submitting requires a VERIFIED supplier and a complete listing.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  BRAND_REPOSITORY,
  LISTING_REPOSITORY,
  SERIES_REPOSITORY,
  SUPPLIER_REPOSITORY,
  VEHICLE_REPOSITORY,
} from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import {
  deriveListingTitle,
  missingForSubmit,
  ListingStatus,
  type Listing,
} from '../../domain/entities/listing';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import type { Vehicle } from '../../domain/entities/vehicle';
import type { Series } from '../../domain/entities/series';
import type { Brand } from '../../domain/entities/brand';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface CreateListingInput extends Partial<Listing> {
  supplierId: string;
  /**
   * "Don't just save it. Send it in." Kept under its original name because
   * that is what the supplier app posts; what it now buys is a place in the
   * review queue, not a place on the marketplace.
   */
  publish?: boolean;
}

/** One catalog entry resolved all the way up to its brand. */
export interface ResolvedCatalog {
  vehicle: Vehicle;
  series: Series;
  brand: Brand;
}

@Injectable()
export class CreateListingUseCase extends BaseUseCase<
  CreateListingInput,
  Listing
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute(input: CreateListingInput): Promise<Listing> {
    const { publish, supplierId, ...fields } = input;

    // A draft may be saved without a car chosen yet; if one IS chosen it has to
    // be a real catalog entry.
    const catalog = fields.vehicleId
      ? await this.resolveCatalog(fields.vehicleId)
      : null;

    let status = ListingStatus.DRAFT;

    if (publish) {
      const supplier = await this.suppliers.findById(supplierId);
      if (!supplier) throw new ForbiddenError('Supplier not found.');
      if (supplier.accountStatus !== SupplierAccountStatus.VERIFIED) {
        throw new ForbiddenError(
          'Your store must be verified before you can submit a car for listing.',
        );
      }
      // missingForSubmit, not missingForPublish: a car the catalog does not
      // carry yet may still be sent in, and reaching the queue is how it gets
      // added. The publish transition applies the stricter rule.
      const missing = missingForSubmit(fields);
      if (missing.length) {
        throw new ValidationError(
          `Complete these before submitting: ${missing.join(', ')}.`,
        );
      }
      status = ListingStatus.SUBMITTED;
    }

    const listing: Listing = {
      ...(fields as Partial<Listing>),
      supplierId,
      status,
      seriesId: catalog?.series._id,
      brandId: catalog?.brand._id,
      // A real catalog entry wins: the proposal exists only to stand in for one.
      proposedVehicle: catalog ? null : (fields.proposedVehicle ?? null),
      title: fields.title?.trim() || this.titleFor(catalog, fields),
      features: fields.features ?? [],
      photos: fields.photos ?? [],
      videos: fields.videos ?? [],
      submittedAt: status === ListingStatus.SUBMITTED ? new Date() : null,
    } as Listing;

    return this.listings.create(listing);
  }

  /**
   * Walks vehicle → series → brand. Each hop is checked: a vehicle whose series
   * or brand has vanished is a broken catalog entry, and a listing built on one
   * would show a blank make forever.
   */
  private async resolveCatalog(vehicleId: string): Promise<ResolvedCatalog> {
    const vehicle = await this.vehicles.findById(vehicleId);
    if (!vehicle) throw new ResourceNotFoundError('Vehicle not found.');

    const series = await this.series.findById(vehicle.seriesId);
    if (!series) throw new ResourceNotFoundError('Series not found.');

    const brand = await this.brands.findById(series.brandId);
    if (!brand) throw new ResourceNotFoundError('Brand not found.');

    return { vehicle, series, brand };
  }

  /**
   * The catalog entry names the car when there is one. Failing that a proposal
   * does, so a listing awaiting a catalog addition still reads as "2024 Jetour
   * T2 2.0" in the queue rather than "Untitled listing".
   */
  private titleFor(
    catalog: ResolvedCatalog | null,
    fields: Partial<Listing>,
  ): string {
    if (catalog) {
      return deriveListingTitle({
        year: catalog.vehicle.year,
        brand: catalog.brand.name,
        series: catalog.series.name,
        variant: catalog.vehicle.variant,
      });
    }
    const proposed = fields.proposedVehicle;
    if (proposed) {
      return deriveListingTitle({
        year: proposed.year,
        brand: proposed.brand,
        series: proposed.series,
        variant: proposed.variant,
      });
    }
    return deriveListingTitle({});
  }
}
