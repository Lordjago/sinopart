/**
 * GetPurchaseCheckoutUseCase: what the purchase screen renders.
 * (GET /checkout/purchase/:inspectionId)
 * ---------------------------------------------------------------------------
 * Keyed on the INSPECTION, not the listing, because that is what a purchase is
 * here: converting a passed report into a sale. It also means the screen cannot
 * be reached for a car the dealer never had inspected.
 *
 * The number this returns is the number PurchaseListingUseCase charges, built
 * by the same `buildOrderMoney`, so the credit shown and the credit applied are
 * one calculation rather than two that agree today.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
  ORDER_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { OrderRepository } from '../../interfaces/repository/order.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { InspectionStatus } from '../../domain/entities/inspection';
import { buildOrderMoney, type OrderMoney } from '../../domain/entities/order';
import { fmtNaira, landedPrice } from '../../domain/value-object/landed-price';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { SettingsService } from '../config/settings.service';
import type { CheckoutRow } from './get-inspection-checkout.usecase';

export interface PurchaseCheckoutView {
  state: 'review' | 'unavailable' | 'paid' | 'kyc';
  inspectionId: string;
  listingId: string;
  /** Set once bought, so the screen can send them to the order instead. */
  orderId: string | null;

  payable: boolean;
  reason: string | null;

  money: OrderMoney;
  currency: string;
  /** The headline: what leaves their account today. */
  dueNowLabel: string;

  car: {
    title: string;
    photo: string | null;
    vin: string | null;
    province: string | null;
    storeName: string | null;
  };

  /** Settled in China now. */
  payNow: CheckoutRow[];
  /** Paid in Nigeria on arrival, at the agent's real figure. */
  onArrival: CheckoutRow[];
}

@Injectable()
export class GetPurchaseCheckoutUseCase extends BaseUseCase<
  { inspectionId: string; buyerId: string },
  PurchaseCheckoutView
> {
  constructor(
    @Inject(INSPECTION_REPOSITORY)
    private readonly inspections: InspectionRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute({
    inspectionId,
    buyerId,
  }: {
    inspectionId: string;
    buyerId: string;
  }): Promise<PurchaseCheckoutView> {
    const inspection = await this.inspections.findById(inspectionId);
    if (!inspection) throw new ResourceNotFoundError('Inspection not found.');
    if (inspection.buyerId !== buyerId) {
      throw new ForbiddenError('This inspection belongs to another dealer.');
    }

    const [listing, supplier, existingOrder, rates] = await Promise.all([
      this.listings.findById(inspection.listingId),
      this.suppliers.findById(inspection.supplierId),
      this.orders.findByInspection(inspectionId),
      this.settings.pricing(),
    ]);
    if (!listing) throw new ResourceNotFoundError('Car not found.');

    const totals = landedPrice(listing.fobPrice, rates);
    const money = buildOrderMoney(
      {
        vehicle: totals.vehicle,
        freight: totals.freight,
        fees: totals.fees,
        duty: totals.duty,
      },
      inspection.fee,
    );

    // The same rules the payment enforces, so the screen refuses up front.
    const passed = inspection.status === InspectionStatus.PASSED;

    // Verification is checked here too. In practice a dealer cannot own a
    // passed inspection without having been verified to pay for it, but this
    // screen must not rely on that remaining true — and a dealer un-verified
    // after the fact should see why, not hit a 403 on submit.
    const buyer = await this.users.findById(buyerId);
    const needsKyc = !buyer?.verified;

    const reason = existingOrder
      ? 'You have already paid for this car.'
      : !passed
        ? inspection.status === InspectionStatus.FAILED
          ? 'This car failed inspection, so it cannot be bought.'
          : 'The inspection on this car is not finished yet.'
        : needsKyc
          ? 'Your account must be verified before you can pay for this car.'
          : null;

    return {
      state: existingOrder
        ? 'paid'
        : !passed
          ? 'unavailable'
          : needsKyc
            ? 'kyc'
            : 'review',
      inspectionId,
      listingId: listing._id!,
      orderId: existingOrder?._id ?? null,

      payable: passed && !existingOrder && !needsKyc,
      reason,

      money,
      currency: inspection.currency ?? 'NGN',
      dueNowLabel: fmtNaira(money.dueNow),

      car: {
        title: listing.title,
        photo: listing.photos?.[0] ?? null,
        vin: listing.vin ?? null,
        province: listing.province ?? null,
        storeName: supplier?.storeName ?? null,
      },

      payNow: [
        { type: 'row', label: 'Vehicle', value: fmtNaira(money.vehicle) },
        {
          type: 'row',
          label: 'Freight & insurance',
          value: fmtNaira(money.freight),
        },
        { type: 'row', label: 'Sinopart fees', value: fmtNaira(money.fees) },
        { type: 'row', label: 'Subtotal', value: fmtNaira(money.subtotal) },
        {
          type: 'row',
          label: 'Inspection fee, already paid',
          value: `- ${fmtNaira(money.inspectionCredit)}`,
        },
        { type: 'total', label: 'Due now', value: fmtNaira(money.dueNow) },
      ],
      onArrival: [
        {
          type: 'row',
          label: 'Duty & clearance',
          value: fmtNaira(money.dutyEstimate),
        },
      ],
    };
  }
}
