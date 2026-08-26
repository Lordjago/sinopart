/**
 * UpdateListingUseCase: edit a listing's fields.
 * ---------------------------------------------------------------------------
 * Allowed only for the owner and only while the listing is in an editable state
 * (draft / submitted / paused). A live listing is frozen too: it is in front of
 * dealers, so the store pauses it, edits, and puts it back. Once a buyer is
 * involved (reserved, pending, sold) it is frozen for good. Lifecycle
 * (submit/pause) is NOT changed here.
 *
 * The check lives here rather than in the controller so a PATCH sent directly
 * (Postman, a stale client) is rejected too.
 *
 * Changing `vehicleId` re-points the listing at a different catalog entry, so
 * the copied `seriesId`/`brandId` and the derived title are all recomputed
 * together. A client never sends those three itself.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  BRAND_REPOSITORY,
  LISTING_REPOSITORY,
  SERIES_REPOSITORY,
  VEHICLE_REPOSITORY,
} from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { VehicleRepository } from '../../interfaces/repository/vehicle.repository';
import type { SeriesRepository } from '../../interfaces/repository/series.repository';
import type { BrandRepository } from '../../interfaces/repository/brand.repository';
import {
  EDITABLE_STATUSES,
  ListingStatus,
  deriveListingTitle,
  type Listing,
} from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface UpdateListingInput extends Partial<Listing> {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class UpdateListingUseCase extends BaseUseCase<
  UpdateListingInput,
  Listing
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicles: VehicleRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly series: SeriesRepository,
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepository,
  ) {
    super();
  }

  async execute(input: UpdateListingInput): Promise<Listing> {
    const { supplierId, listingId, ...patch } = input;

    const existing = await this.listings.findById(listingId);
    if (!existing) throw new ResourceNotFoundError('Listing not found.');
    if (existing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    // Its own message: unlike the order states, the supplier can clear this
    // one themselves, so the error says how.
    if (existing.status === ListingStatus.AVAILABLE) {
      throw new ValidationError(
        'This car is live on the marketplace and cannot be edited. Pause it first, then make your changes.',
      );
    }
    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw new ValidationError(
        'This listing can no longer be edited while an order is in progress.',
      );
    }

    // A new car chosen: re-resolve the tree, re-copy the parents, and refresh
    // the title unless the supplier set one explicitly.
    if (
      patch.vehicleId !== undefined &&
      patch.vehicleId !== existing.vehicleId
    ) {
      const vehicle = await this.vehicles.findById(patch.vehicleId);
      if (!vehicle) throw new ResourceNotFoundError('Vehicle not found.');

      const series = await this.series.findById(vehicle.seriesId);
      if (!series) throw new ResourceNotFoundError('Series not found.');

      const brand = await this.brands.findById(series.brandId);
      if (!brand) throw new ResourceNotFoundError('Brand not found.');

      patch.seriesId = series._id;
      patch.brandId = brand._id;
      // The catalog now carries this car, so the stand-in goes. This is the
      // step that closes the loop: admin adds the entry, supplier re-picks it,
      // and the listing stops being a proposal.
      patch.proposedVehicle = null;

      if (patch.title === undefined) {
        patch.title = deriveListingTitle({
          year: vehicle.year,
          brand: brand.name,
          series: series.name,
          variant: vehicle.variant,
        });
      }
    }

    return this.listings.update(listingId, patch);
  }
}
