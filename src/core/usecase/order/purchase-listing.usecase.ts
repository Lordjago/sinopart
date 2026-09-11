/**
 * PurchaseListingUseCase: a dealer buys the car they had inspected.
 * (POST /orders)
 * ---------------------------------------------------------------------------
 * The second and larger payment. What makes it different from the inspection
 * fee is the credit: the dealer already paid to have this car inspected, and
 * that money counts toward it. So the amount taken here is
 *
 *     vehicle + freight + fees  -  inspection fee already paid
 *
 * with duty left out entirely. Duty is a third party's charge collected in
 * Nigeria at the real figure, so crediting against it would mean quietly
 * under-collecting from the agent.
 *
 * Three gates, in order of what they protect:
 *   - the buyer must own a PASSED inspection on this car. No report, no sale.
 *   - the inspection must not already have an order. One report buys one car.
 *   - the listing must still be RESERVED to this buyer, which it is for the
 *     length of their hold.
 *
 * Payment is not wired to a gateway yet, exactly as with the inspection fee:
 * this call stands in for a successful charge. When a gateway lands it verifies
 * the charge and passes its reference in, and nothing else here changes.
 */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
  MAIL_SERVICE,
  ORDER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { OrderRepository } from '../../interfaces/repository/order.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { MailService } from '../../interfaces/services/mail.service';
import { orderPlacedTemplate } from '../../mail/order.template';
import type { Listing } from '../../domain/entities/listing';
import {
  buildEscrow,
  buildOrderMoney,
  buildOrderRef,
  OrderStatus,
  type Order,
} from '../../domain/entities/order';
import { InspectionStatus } from '../../domain/entities/inspection';
import { ListingStatus } from '../../domain/entities/listing';
import { landedPrice } from '../../domain/value-object/landed-price';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { requireVerifiedDealer } from '../dealer-kyc/require-verified-dealer';
import { ValidationError } from '../../errors/validation.error';
import { SettingsService } from '../config/settings.service';

export interface PurchaseListingInput {
  buyerId: string;
  /** The passed inspection being converted into a purchase. */
  inspectionId: string;
  paymentReference?: string | null;
}

@Injectable()
export class PurchaseListingUseCase extends BaseUseCase<
  PurchaseListingInput,
  Order
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(INSPECTION_REPOSITORY)
    private readonly inspections: InspectionRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(MAIL_SERVICE)
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async execute(input: PurchaseListingInput): Promise<Order> {
    // Same gate as the inspection payment. Reaching here already requires a
    // passed inspection, which an unverified dealer cannot have paid for — but
    // this must not depend on that staying true.
    requireVerifiedDealer(await this.users.findById(input.buyerId));

    const inspection = await this.inspections.findById(input.inspectionId);
    if (!inspection) throw new ResourceNotFoundError('Inspection not found.');
    if (inspection.buyerId !== input.buyerId) {
      throw new ForbiddenError('This inspection belongs to another dealer.');
    }

    // No report, no sale. This is the product.
    if (inspection.status !== InspectionStatus.PASSED) {
      throw new ValidationError(
        inspection.status === InspectionStatus.FAILED
          ? 'This car failed inspection, so it cannot be bought.'
          : 'The inspection on this car is not finished yet.',
      );
    }

    // One report buys one car. The unique index backs this up if two requests
    // arrive together.
    const existing = await this.orders.findByInspection(input.inspectionId);
    if (existing) {
      throw new ValidationError('You have already paid for this car.');
    }

    const listing = await this.listings.findById(inspection.listingId);
    if (!listing) throw new ResourceNotFoundError('Car not found.');
    if (listing.status !== ListingStatus.RESERVED) {
      throw new ValidationError(
        'This car is no longer held for you. Your reservation may have lapsed.',
      );
    }

    const [rates, releasePct] = await Promise.all([
      this.settings.pricing(),
      this.settings.escrowReleasePct(),
    ]);

    /* Priced from the SAME calculation the catalog and checkout quote, so the
       figure a dealer agreed to is the figure taken. Snapshotted onto the order
       from here on: the rates are operator-editable and a completed contract
       must not move when someone edits the FX rate. */
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

    const now = new Date();
    const order = await this.orders.create({
      reference: buildOrderRef(Math.random()),
      listingId: listing._id!,
      supplierId: listing.supplierId,
      buyerId: input.buyerId,
      inspectionId: input.inspectionId,
      status: OrderStatus.SECURING,
      money,
      currency: inspection.currency ?? 'NGN',
      escrow: buildEscrow(money.subtotal, releasePct),
      paidAt: now,
      paymentReference: input.paymentReference ?? null,
    });

    // The car is sold. It leaves the marketplace for good: a PENDING listing is
    // one nobody else can inspect, buy, or see in the catalog.
    await this.listings.setStatus(listing._id!, ListingStatus.PENDING);

    /* Receipt for the largest payment a dealer makes here. Not awaited: the
       money is taken and the order exists either way, and a mail failure must
       not read back to the dealer as a failed purchase. */
    this.sendReceipt(order, listing);

    return order;
  }

  private async sendReceipt(order: Order, listing: Listing): Promise<void> {
    const buyer = await this.users.findById(order.buyerId);
    if (!buyer?.email) return;

    await this.mail.send(
      orderPlacedTemplate({
        to: buyer.email,
        car: listing.title,
        reference: order.reference,
        orderId: String(order._id),
        vin: listing.vin ?? null,
        subtotal: order.money.subtotal,
        inspectionCredit: order.money.inspectionCredit,
        dueNow: order.money.dueNow,
      }),
    );
  }
}
