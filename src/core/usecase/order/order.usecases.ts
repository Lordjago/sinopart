/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Reading orders, and moving them along.
 * ---------------------------------------------------------------------------
 * Who may do what is the whole design here:
 *
 *   the back office  moves the car (loaded, arrived, cleared, delivered)
 *   the dealer       confirms it arrived as described, or disputes it
 *   the store        watches, and is paid against those milestones
 *
 * The dealer's confirmation is deliberately not an admin action. The 15%
 * holdback exists to give the VIN check teeth, and a holdback the seller's own
 * counterparty can release on the buyer's behalf protects nobody.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  LISTING_REPOSITORY,
  MAIL_SERVICE,
  ORDER_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type {
  OrderFilters,
  OrderRepository,
} from '../../interfaces/repository/order.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { Page } from '../../domain/value-object/page';
import {
  canMoveOrder,
  OrderStatus,
  type Order,
} from '../../domain/entities/order';
import { ListingStatus } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';
import type {
  Email,
  MailService,
} from '../../interfaces/services/mail.service';
import {
  orderClearanceDueTemplate,
  orderClearedTemplate,
  orderClearingTemplate,
  orderCompleteTemplate,
  orderDeliveredTemplate,
  orderLandedTemplate,
  orderPreparingTemplate,
  orderShippedTemplate,
  orderStoppedTemplate,
  orderUpdateTemplate,
} from '../../mail/order.template';
import { toOrderView, type OrderView } from './order.view';

/* ------------------------------- reads -------------------------------- */

export interface ListOrdersInput extends OrderFilters {
  includeContact?: boolean;
  all?: boolean;
}

@Injectable()
export class ListOrdersUseCase extends BaseUseCase<
  ListOrdersInput,
  Page<OrderView>
> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    super();
  }

  async execute(input: ListOrdersInput): Promise<Page<OrderView>> {
    const { includeContact, all, ...filters } = input;
    const page = all
      ? await this.allAsPage(filters)
      : await this.orders.find(filters);

    const views = await Promise.all(
      page.data.map((order) =>
        resolve(
          order,
          this.listings,
          this.suppliers,
          this.users,
          includeContact,
        ),
      ),
    );
    return new Page(views, page.page, page.limit, page.total);
  }

  private async allAsPage(filters: OrderFilters): Promise<Page<Order>> {
    const rows = await this.orders.findAllFor(filters);
    return new Page(rows, 1, Math.max(1, rows.length), rows.length);
  }
}

export type OrderViewer = 'buyer' | 'supplier' | 'admin';

export interface GetOrderInput {
  orderId: string;
  as: OrderViewer;
  viewerId?: string;
}

@Injectable()
export class GetOrderUseCase extends BaseUseCase<GetOrderInput, OrderView> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    super();
  }

  async execute({ orderId, as, viewerId }: GetOrderInput): Promise<OrderView> {
    const order = await requireOrder(this.orders, orderId, as, viewerId);
    // Both parties are shipping a car between them, so once an order exists
    // they can reach each other. There is nothing to coordinate before that.
    return resolve(order, this.listings, this.suppliers, this.users, true);
  }
}

/* ------------------------------- writes ------------------------------- */

export interface AdvanceOrderInput {
  orderId: string;
  to: OrderStatus;
  note?: string;
  trackingReference?: string;
  etaAt?: string;
  /** The agent's real clearance bill. Expected when moving to AT_PORT, which
      is where the dealer is asked to pay it. */
  clearance?: {
    duty: number;
    vat: number;
    agentFees: number;
    total: number;
    graceDeadline?: string;
  };
}

/**
 * The back office moving a car along its journey.
 *
 * Each stage stamps its own milestone, so the timeline both parties read is
 * built from what actually happened rather than from a status alone. Reaching
 * IN_TRANSIT is the one with money attached: loading is VIN-verified, so the
 * store's 85% releases.
 */
@Injectable()
export class AdvanceOrderUseCase extends BaseUseCase<
  AdvanceOrderInput,
  OrderView
> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  private readonly logger = new Logger('AdvanceOrder');

  async execute(input: AdvanceOrderInput): Promise<OrderView> {
    const order = await this.orders.findById(input.orderId);
    if (!order) throw new ResourceNotFoundError('Order not found.');

    if (!canMoveOrder(order.status, input.to)) {
      throw new ValidationError(
        `An order at ${order.status} cannot move to ${input.to}.`,
      );
    }
    // Completing is the dealer's word. See ConfirmDeliveryUseCase.
    if (input.to === OrderStatus.COMPLETED) {
      throw new ForbiddenError(
        'Only the dealer can confirm delivery and release the holdback.',
      );
    }

    const now = new Date();
    const patch: Partial<Order> = { status: input.to };
    if (input.note !== undefined)
      patch.trackingNote = input.note.trim() || null;
    if (input.trackingReference !== undefined) {
      patch.trackingReference = input.trackingReference.trim() || null;
    }
    if (input.etaAt) patch.etaAt = new Date(input.etaAt);
    if (input.clearance) {
      patch.clearance = {
        ...input.clearance,
        graceDeadline: input.clearance.graceDeadline
          ? new Date(input.clearance.graceDeadline)
          : null,
      };
    }

    switch (input.to) {
      case OrderStatus.IN_TRANSIT:
        patch.loadedAt = now;
        patch.vinVerifiedAt = now;
        // The milestone the money is tied to.
        patch.escrow = { ...order.escrow, releasedAt: now };
        break;
      case OrderStatus.AT_PORT:
        patch.arrivedAt = now;
        break;
      case OrderStatus.CLEARING:
        patch.clearingStartedAt = now;
        break;
      case OrderStatus.CLEARED:
        patch.clearedAt = now;
        break;
      case OrderStatus.DELIVERED:
        patch.deliveredAt = now;
        break;
      case OrderStatus.CANCELLED:
        patch.cancelledAt = now;
        break;
      default:
        break;
    }

    const updated = await this.orders.update(input.orderId, patch);

    // A cancelled order puts the car back where it came from, as a draft the
    // store can relist. Not straight to available: it has been through a sale
    // and deserves another look before it faces buyers again.
    if (input.to === OrderStatus.CANCELLED) {
      await this.listings.setStatus(order.listingId, ListingStatus.DRAFT);
    }

    const view = await resolve(
      updated,
      this.listings,
      this.suppliers,
      this.users,
      true,
    );

    /* Not awaited: the back office moved the order and that is saved. Mail
       must not make an operator's click fail or hang. */
    this.notifyBuyer(updated, view, input.to);

    return view;
  }

  /**
   * The emails a stage change owes the dealer.
   *
   * Landing sends two — the car arrived, and here is what clearance costs —
   * because from the dealer's side those are one event: their car is in Lagos
   * and they now owe money on it. Everything else sends one, or none.
   *
   * Where a stage has nothing specific to say it rides on the back office's
   * own tracking note, and where there is no note nothing is sent: an email
   * that says "your order changed" and no more is worse than silence.
   */
  private async notifyBuyer(
    order: Order,
    view: OrderView,
    to: OrderStatus,
  ): Promise<void> {
    const buyer = await this.users.findById(order.buyerId);
    if (!buyer?.email || !view.car) return;

    const base = {
      to: buyer.email,
      car: view.car.title,
      reference: order.reference,
      orderId: String(order._id),
      vin: view.car.vin ?? null,
    };
    const vessel = order.trackingReference ?? null;
    const etaAt = order.etaAt ?? null;
    const clearance = order.clearance ?? null;

    const emails: Email[] = [];
    switch (to) {
      case OrderStatus.IN_TRANSIT:
        emails.push(orderShippedTemplate({ ...base, vessel, etaAt }));
        break;

      case OrderStatus.AT_PORT:
        emails.push(orderLandedTemplate(base));
        /* The bill only goes out when the agent's real figures are in. D28's
           whole claim is "this is the actual figure, not an estimate", so
           quoting the purchase estimate here would invert its meaning, and a
           blank total is not a sendable email. The operator can trigger it by
           saving the figures. */
        if (clearance?.total) {
          emails.push(
            orderClearanceDueTemplate({
              ...base,
              duty: clearance.duty,
              vat: clearance.vat,
              agentFees: clearance.agentFees,
              total: clearance.total,
              estimate: order.money.dutyEstimate,
              graceDeadline: clearance.graceDeadline ?? null,
            }),
          );
        } else {
          this.logger.warn(
            `Order ${order.reference} reached at_port with no clearance figures; the dealer was not billed.`,
          );
        }
        break;

      case OrderStatus.CLEARING:
        emails.push(
          orderClearingTemplate({
            ...base,
            clearanceTotal: clearance?.total ?? null,
          }),
        );
        break;

      case OrderStatus.CLEARED:
        emails.push(orderClearedTemplate(base));
        break;

      case OrderStatus.DELIVERED:
        emails.push(
          orderDeliveredTemplate({
            ...base,
            inspectionId: order.inspectionId ?? null,
            disputeDeadline: addDays(
              order.deliveredAt ?? new Date(),
              DISPUTE_WINDOW_DAYS,
            ),
          }),
        );
        break;

      case OrderStatus.CANCELLED:
        emails.push(
          orderStoppedTemplate({
            ...base,
            reason: order.trackingNote ?? null,
          }),
        );
        break;

      default:
        if (order.trackingNote) {
          emails.push(
            orderUpdateTemplate({
              ...base,
              note: order.trackingNote,
              vessel,
              etaAt,
            }),
          );
        }
        break;
    }

    for (const email of emails) await this.mail.send(email);
  }
}

export interface ConfirmDeliveryInput {
  orderId: string;
  buyerId: string;
  /** Present when the dealer is raising a problem instead of confirming. */
  disputeReason?: string;
}

/**
 * The dealer's last word: the car matches the report, or it does not.
 *
 * Confirming releases the holdback and marks the listing SOLD. Disputing stops
 * the holdback where it is and leaves the order open for the back office. This
 * is the only transition the buyer owns, and it is the one that matters most.
 */
@Injectable()
export class ConfirmDeliveryUseCase extends BaseUseCase<
  ConfirmDeliveryInput,
  OrderView
> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  async execute(input: ConfirmDeliveryInput): Promise<OrderView> {
    const order = await this.orders.findById(input.orderId);
    if (!order) throw new ResourceNotFoundError('Order not found.');
    if (order.buyerId !== input.buyerId) {
      throw new ForbiddenError('This order belongs to another dealer.');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new ValidationError(
        'This car has not been marked delivered yet, so there is nothing to confirm.',
      );
    }

    const now = new Date();

    if (input.disputeReason?.trim()) {
      const updated = await this.orders.update(input.orderId, {
        status: OrderStatus.DISPUTED,
        disputeReason: input.disputeReason.trim(),
      });
      return resolve(updated, this.listings, this.suppliers, this.users, true);
    }

    const updated = await this.orders.update(input.orderId, {
      status: OrderStatus.COMPLETED,
      completedAt: now,
      escrow: { ...order.escrow, holdbackReleasedAt: now },
    });
    await this.listings.setStatus(order.listingId, ListingStatus.SOLD);

    const view = await resolve(
      updated,
      this.listings,
      this.suppliers,
      this.users,
      true,
    );

    /* The receipt for a closed order: it says where the documents are, which
       is the one thing a dealer comes back for months later. Not awaited —
       the holdback is already released and the order is already closed. */
    this.sendCompletionReceipt(updated, view);

    return view;
  }

  private async sendCompletionReceipt(
    order: Order,
    view: OrderView,
  ): Promise<void> {
    const buyer = await this.users.findById(order.buyerId);
    if (!buyer?.email || !view.car) return;

    await this.mail.send(
      orderCompleteTemplate({
        to: buyer.email,
        car: view.car.title,
        reference: order.reference,
        orderId: String(order._id),
        vin: view.car.vin ?? null,
        name: buyer.name,
      }),
    );
  }
}

export interface MarkOrderPreparedInput {
  orderId: string;
  supplierId: string;
}

/**
 * The store saying the car is ready to be collected.
 *
 * Deliberately NOT a status transition. SECURING -> IN_TRANSIT is the back
 * office's call and releases 85% of the escrow against a VIN-verified loading;
 * a store marking its own car ready must never be able to trigger that. So this
 * stamps a milestone the back office can queue on, and leaves the status alone.
 *
 * Idempotent: marking twice keeps the first timestamp, because "when did the
 * store say it was ready" is a fact about the yard, not about how many times
 * someone clicked.
 */
@Injectable()
export class MarkOrderPreparedUseCase extends BaseUseCase<
  MarkOrderPreparedInput,
  OrderView
> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {
    super();
  }

  async execute({
    orderId,
    supplierId,
  }: MarkOrderPreparedInput): Promise<OrderView> {
    const order = await requireOrder(
      this.orders,
      orderId,
      'supplier',
      supplierId,
    );

    if (order.status !== OrderStatus.SECURING) {
      throw new ValidationError(
        'This car has already left the yard, so it cannot be marked ready.',
      );
    }

    /* Already marked: keep the first timestamp AND stay silent. The dealer
       was told the first time, and a second email saying the same thing turns
       a milestone into noise. */
    if (order.preparedAt) {
      return resolve(order, this.listings, this.suppliers, this.users, true);
    }

    const updated = await this.orders.update(orderId, {
      preparedAt: new Date(),
    });

    const view = await resolve(
      updated,
      this.listings,
      this.suppliers,
      this.users,
      true,
    );

    /* Not awaited: the yard clicked a button and the timestamp is already
       saved. Mail must not make that click fail or hang. */
    this.notifyBuyer(updated, view);

    return view;
  }

  private async notifyBuyer(order: Order, view: OrderView): Promise<void> {
    const buyer = await this.users.findById(order.buyerId);
    if (!buyer?.email || !view.car) return;

    await this.mail.send(
      orderPreparingTemplate({
        to: buyer.email,
        car: view.car.title,
        reference: order.reference,
        orderId: String(order._id),
        vin: view.car.vin ?? null,
      }),
    );
  }
}

/* ------------------------------ helpers ------------------------------- */

/** How long a dealer has to say the car does not match the report. */
const DISPUTE_WINDOW_DAYS = 7;

const addDays = (from: Date, days: number): Date =>
  new Date(from.getTime() + days * 24 * 3600_000);

async function requireOrder(
  orders: OrderRepository,
  orderId: string,
  as: OrderViewer,
  viewerId?: string,
): Promise<Order> {
  const order = await orders.findById(orderId);
  if (!order) throw new ResourceNotFoundError('Order not found.');
  if (as === 'buyer' && order.buyerId !== viewerId) {
    throw new ForbiddenError('This order belongs to another dealer.');
  }
  if (as === 'supplier' && order.supplierId !== viewerId) {
    throw new ForbiddenError('This order belongs to another store.');
  }
  return order;
}

/**
 * Fill in the car, the store and the dealer. A missing part is tolerated: a
 * deleted listing should leave the order readable, not blow up a page of them.
 */
async function resolve(
  order: Order,
  listings: ListingRepository,
  suppliers: SupplierRepository,
  users: UserRepository,
  includeContact?: boolean,
): Promise<OrderView> {
  const [listing, supplier, buyer] = await Promise.all([
    listings.findById(order.listingId),
    suppliers.findById(order.supplierId),
    users.findById(order.buyerId),
  ]);
  return toOrderView(order, { listing, supplier, buyer, includeContact });
}
