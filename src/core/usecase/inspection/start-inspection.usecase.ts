/**
 * StartInspectionUseCase: a dealer pays to have a car inspected.
 * (POST /inspections)
 * ---------------------------------------------------------------------------
 * This is the transaction that reserves a car. It creates the inspection AND
 * moves the listing to RESERVED, because "no one else can inspect or buy it
 * while you decide" is the thing the fee actually buys. Leaving the listing
 * AVAILABLE and calling it reserved in the UI would be a promise the data does
 * not keep.
 *
 * Payment is not wired to a gateway yet. `paymentReference` stays null and the
 * call itself stands in for a successful charge, so the flow can be built and
 * tested end to end; when the gateway lands it verifies the charge first and
 * passes its reference in, and nothing else here changes.
 *
 * Two guards matter more than the rest:
 *   - the car must be AVAILABLE. A reserved or sold car cannot be paid for
 *     again, which is what stops two dealers buying the same reservation.
 *   - the buyer must be signed in. The controller enforces the role; this
 *     records who it was, because a reservation with no owner is meaningless.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
} from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import {
  buildInspectionRef,
  reservationDeadline,
  InspectionStatus,
  type Inspection,
} from '../../domain/entities/inspection';
import { ListingStatus } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import { SettingsService } from '../config/settings.service';

export interface StartInspectionInput {
  buyerId: string;
  listingId: string;
  /** Set once a gateway is charging the card. Null while payment is simulated. */
  paymentReference?: string | null;
}


@Injectable()
export class StartInspectionUseCase extends BaseUseCase<
  StartInspectionInput,
  Inspection
> {
  constructor(
    @Inject(INSPECTION_REPOSITORY)
    private readonly inspections: InspectionRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute(input: StartInspectionInput): Promise<Inspection> {
    const listing = await this.listings.findById(input.listingId);
    if (!listing) throw new ResourceNotFoundError('Car not found.');

    if (listing.status !== ListingStatus.AVAILABLE) {
      throw new ValidationError(
        listing.status === ListingStatus.RESERVED
          ? 'Another dealer is already inspecting this car.'
          : 'This car is not available to inspect right now.',
      );
    }

    // Belt and braces against a double-submit racing the status check above.
    const existing = await this.inspections.findActiveForListing(
      input.listingId,
    );
    if (existing) {
      throw new ValidationError(
        'Another dealer is already inspecting this car.',
      );
    }

    // The fee and the hold window are operator-editable (see the config
    // screen). Read at the moment of charging, so what is taken matches what
    // the checkout screen quoted a second earlier.
    const [fee, hours] = await Promise.all([
      this.settings.inspectionFee(),
      this.settings.reservationHours(),
    ]);

    const now = new Date();
    const inspection = await this.inspections.create({
      reference: buildInspectionRef(now, Math.random()),
      listingId: input.listingId,
      supplierId: listing.supplierId,
      buyerId: input.buyerId,
      status: InspectionStatus.PAID,
      fee,
      currency: 'NGN',
      paidAt: now,
      paymentReference: input.paymentReference ?? null,
      reservedUntil: reservationDeadline(now, hours),
    } as Inspection);

    // The reservation is the point. If this write fails the fee has been taken
    // for a car still on sale, so it is not something to do best-effort.
    await this.listings.setStatus(input.listingId, ListingStatus.RESERVED);

    return inspection;
  }
}
