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
 * Buyer-aware. It used to be public on the grounds that nothing here was
 * specific to one dealer, but that stopped being true once payment required a
 * verified account: whether THIS dealer may pay is now part of the answer.
 * A signed-out viewer still gets the price and terms — `buyerId` is optional,
 * and its absence means no verification verdict is rendered at all.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  LISTING_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
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
  /**
   * The screen's own state machine. `review` means it can take a payment;
   * `kyc` means this dealer must finish verification before it can.
   */
  state: 'review' | 'unavailable' | 'kyc';
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

export interface InspectionCheckoutQuery {
  listingId: string;
  /** Absent for a signed-out viewer, who sees price and terms but no verdict. */
  buyerId?: string | null;
}

@Injectable()
export class GetInspectionCheckoutUseCase extends BaseUseCase<
  InspectionCheckoutQuery,
  InspectionCheckoutView
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute({
    listingId,
    buyerId,
  }: InspectionCheckoutQuery): Promise<InspectionCheckoutView> {
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

    // The verification gate the payment enforces, mirrored here. Read the row,
    // not a token claim, for the reason requireVerifiedDealer explains. Note a
    // signed-out viewer is NOT treated as unverified: they are simply not being
    // judged yet, and are still sent to log in at the point of paying.
    const buyer = buyerId ? await this.users.findById(buyerId) : null;
    const needsKyc = Boolean(buyerId) && !buyer?.verified;

    const reason = !available
      ? listing.status === ListingStatus.RESERVED
        ? 'Another dealer is already inspecting this car.'
        : 'This car is not available to inspect right now.'
      : needsKyc
        ? 'Your account must be verified before you can pay for an inspection.'
        : null;

    return {
      // Availability first: a taken car is a harder no than an unverified
      // account, and sending a dealer off to verify for a car they cannot have
      // either way wastes their time.
      state: !available ? 'unavailable' : needsKyc ? 'kyc' : 'review',
      listingId: listing._id!,

      fee,
      feeLabel: fmtNaira(fee),
      currency: 'NGN',

      payable: available && !needsKyc,
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
