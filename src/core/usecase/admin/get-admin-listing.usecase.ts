/**
 * GetAdminListingUseCase: one listing in full (GET /admin/listings/:id)
 * ---------------------------------------------------------------------------
 * The screen an admin reads before deciding to publish. Unlike the supplier's
 * own detail endpoint this is not scoped to an owner, the back office looks
 * at every store's cars. And unlike the table row it resolves the whole
 * picture in one call:
 *
 *   listing -> vehicle -> series -> brand   (the car's real identity)
 *   listing -> supplier                     (who is selling it)
 *
 * Every hop is best-effort. A listing whose catalog entry was deleted is
 * exactly the kind of thing an admin needs to SEE, so a broken reference
 * leaves its field null rather than 404-ing the page and hiding the problem.
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
import { missingForPublish } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import type { AdminListingDetailView } from './admin.views';

@Injectable()
export class GetAdminListingUseCase extends BaseUseCase<
  string,
  AdminListingDetailView
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

  async execute(listingId: string): Promise<AdminListingDetailView> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');

    // The store and the car are independent lookups, no reason to wait for
    // one before starting the other.
    const [supplier, vehicle] = await Promise.all([
      this.suppliers.findById(listing.supplierId),
      listing.vehicleId ? this.vehicles.findById(listing.vehicleId) : null,
    ]);

    // Brand hangs off series, so these two do have to be sequential.
    const series = vehicle?.seriesId
      ? await this.series.findById(vehicle.seriesId)
      : null;
    const brand = series?.brandId
      ? await this.brands.findById(series.brandId)
      : null;

    return {
      id: listing._id!,
      status: listing.status,
      title: listing.title,
      vin: listing.vin ?? null,
      body: listing.body ?? null,
      mileageKm: listing.mileageKm ?? null,
      fobPrice: listing.fobPrice ?? null,
      province: listing.province ?? null,
      photos: listing.photos ?? [],
      supplierId: listing.supplierId,
      storeName: supplier?.storeName ?? 'Unknown store',
      supplierStatus: supplier?.accountStatus ?? null,
      // The same domain rule the publish transition enforces, so the screen
      // can say what is missing instead of offering a button that will fail.
      missingForPublish: missingForPublish(listing),
      proposedVehicle: listing.proposedVehicle ?? null,
      reviewNote: listing.reviewNote ?? null,
      submittedAt: listing.submittedAt ?? null,
      publishedAt: listing.publishedAt ?? null,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,

      make: brand?.name ?? null,
      model: series?.name ?? null,
      year: vehicle?.year ?? null,
      variant: vehicle?.variant ?? null,
      fuelType: vehicle?.fuelType ?? null,
      transmission: vehicle?.transmission ?? null,

      drivetrain: listing.drivetrain ?? null,
      exteriorColor: listing.exteriorColor ?? null,
      interiorColor: listing.interiorColor ?? null,
      batteryKwh: listing.batteryKwh ?? null,
      rangeKm: listing.rangeKm ?? null,
      seats: listing.seats ?? null,
      doors: listing.doors ?? null,
      firstRegistered: listing.firstRegistered ?? null,
      features: listing.features ?? [],
      videos: listing.videos ?? [],

      supplier: supplier
        ? {
            id: supplier._id!,
            storeName: supplier.storeName,
            legalName: supplier.legalName ?? null,
            phone: supplier.phone,
            province: supplier.province ?? '',
            accountStatus: supplier.accountStatus,
            tier: supplier.tier,
            officeAddress: supplier.officeAddress ?? null,
          }
        : null,
    };
  }
}
