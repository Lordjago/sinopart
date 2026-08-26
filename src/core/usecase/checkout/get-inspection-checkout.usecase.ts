/**
 * GetInspectionCheckoutUseCase: what the inspection checkout screen renders.
 * (GET /checkout/inspection/:listingId)
 * ---------------------------------------------------------------------------
 * The screen was quoting a fee from one place and paying a fee from another.
 * This endpoint closes that: the `fee` it returns is the same constant
 * StartInspectionUseCase charges, so the number a dealer agrees to and the
 * number we take cannot drift apart.
 *
 * It also answers whether the car can be paid for AT ALL, using the same rule
 * the payment enforces. A dealer should learn a car is taken before filling in
 * a card, not after.
 *
 * Public, because the checkout screen is reachable before signing in: a dealer
 * is allowed to read the price and terms, and is sent to log in at the point of
 * paying. Nothing here is specific to one dealer, so nothing here needs a token.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import { ListingStatus } from '../../domain/entities/listing';
import {
  fmtNaira,
  landedPrice,
  type LandedPrice,
} from '../../domain/value-object/landed-price';
import { SettingsService } from '../config/settings.service';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

/** One line of the cost breakdown the screen prints. */
export interface CheckoutRow {
  type: 'head' | 'row' | 'total';
  label: string;
  value?: string;
}

export interface InspectionCheckoutView {
  /** The screen's own state machine. `review` means it can take a payment. */
  state: 'review' | 'unavailable';
  listingId: string;

  /** The authoritative fee. Quoted here, charged by StartInspectionUseCase. */
  fee: number;
  feeLabel: string;
  currency: string;

  /** False when the car cannot be inspected right now; `reason` says why. */
  payable: boolean;
  reason: string | null;

  car: {
    title: string;
    photo: string | null;
    province: string | null;
    mileageKm: number | null;
    storeName: string | null;
  };

  breakdown: CheckoutRow[];
  /** The same numbers unformatted, for anything that needs to do maths. */
  totals: LandedPrice;
}

@Injectable()
export class GetInspectionCheckoutUseCase extends BaseUseCase<
  string,
  InspectionCheckoutView
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute(listingId: string): Promise<InspectionCheckoutView> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Car not found.');

    const [supplier, rates, fee] = await Promise.all([
      this.suppliers.findById(listing.supplierId),
      this.settings.pricing(),
      this.settings.inspectionFee(),
    ]);
    const totals = landedPrice(listing.fobPrice, rates);

    // The same allow-list the payment enforces, so the screen refuses up front
    // rather than letting a dealer reach the pay button on a car we will not
    // sell them.
    const available = listing.status === ListingStatus.AVAILABLE;
    const reason = available
      ? null
      : listing.status === ListingStatus.RESERVED
        ? 'Another dealer is already inspecting this car.'
        : 'This car is not available to inspect right now.';

    return {
      state: available ? 'review' : 'unavailable',
      listingId: listing._id!,

      fee,
      feeLabel: fmtNaira(fee),
      currency: 'NGN',

      payable: available,
      reason,

      car: {
        title: listing.title,
        photo: listing.photos?.[0] ?? null,
        province: listing.province ?? null,
        mileageKm: listing.mileageKm ?? null,
        storeName: supplier?.storeName ?? null,
      },

      // A car with no price gets the terms and the fee, but no invented total.
      breakdown: totals.hasPrice ? this.toRows(totals) : [],
      totals,
    };
  }

  private toRows(t: LandedPrice): CheckoutRow[] {
    return [
      { type: 'head', label: 'Pay after a pass (settled in China)' },
      { type: 'row', label: 'Vehicle', value: fmtNaira(t.vehicle) },
      { type: 'row', label: 'Freight & insurance', value: fmtNaira(t.freight) },
      { type: 'row', label: 'Sinopart fees', value: fmtNaira(t.fees) },
      { type: 'head', label: 'Pay on arrival (in Nigeria)' },
      { type: 'row', label: 'Duty & clearance', value: fmtNaira(t.duty) },
      { type: 'total', label: 'Total landed', value: fmtNaira(t.landed) },
    ];
  }
}
