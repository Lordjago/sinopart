/**
 * The shape all three apps read an order through.
 *
 * One view, not three, for the same reason the inspection has one: the dealer's
 * tracking screen, the store's order list and the back office's queue are the
 * same facts from different sides. What differs is which contact details travel
 * with it, and that is a flag the caller sets rather than a separate shape.
 *
 * The `stage` field exists because both frontends already speak in stages
 * (see the supplier's ordersData STAGES and the dealer app's tracking stages).
 * Mapping the status here rather than in two clients is what stops the two
 * describing the same order differently.
 */
import type {
  Order,
  OrderEscrow,
  OrderMoney,
  OrderStatus,
} from '../../domain/entities/order';
import { ORDER_FLOW } from '../../domain/entities/order';
import type { Listing } from '../../domain/entities/listing';
import type { Supplier } from '../../domain/entities/supplier';
import type { User } from '../../domain/entities/user';

export interface OrderView {
  id: string;
  reference: string;
  status: OrderStatus;
  /** 0-based position in ORDER_FLOW, for a progress bar. -1 when off-flow. */
  step: number;
  totalSteps: number;

  money: OrderMoney;
  currency: string;
  escrow: OrderEscrow;

  paidAt: Date;
  preparedAt: Date | null;
  loadedAt: Date | null;
  vinVerifiedAt: Date | null;
  arrivedAt: Date | null;
  clearedAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;

  trackingNote: string | null;
  trackingReference: string | null;
  etaAt: Date | null;
  disputeReason: string | null;
  disputeResolvedNote: string | null;

  listingId: string;
  inspectionId: string;
  car: {
    title: string;
    vin: string | null;
    photo: string | null;
    province: string | null;
    mileageKm: number | null;
  } | null;

  supplierId: string;
  store: { id: string; name: string; province: string; phone?: string } | null;

  buyerId: string;
  buyer: { id: string; name: string; email?: string } | null;
}

export interface OrderViewParts {
  listing?: Listing | null;
  supplier?: Supplier | null;
  buyer?: User | null;
  /** Back office, and the two parties once they need to reach each other. */
  includeContact?: boolean;
}

export function toOrderView(
  order: Order,
  parts: OrderViewParts = {},
): OrderView {
  const { listing, supplier, buyer, includeContact } = parts;
  return {
    id: order._id!,
    reference: order.reference,
    status: order.status,
    step: ORDER_FLOW.indexOf(order.status),
    totalSteps: ORDER_FLOW.length,

    money: order.money,
    currency: order.currency,
    escrow: order.escrow,

    paidAt: order.paidAt,
    preparedAt: order.preparedAt ?? null,
    loadedAt: order.loadedAt ?? null,
    vinVerifiedAt: order.vinVerifiedAt ?? null,
    arrivedAt: order.arrivedAt ?? null,
    clearedAt: order.clearedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    completedAt: order.completedAt ?? null,
    cancelledAt: order.cancelledAt ?? null,

    trackingNote: order.trackingNote ?? null,
    trackingReference: order.trackingReference ?? null,
    etaAt: order.etaAt ?? null,
    disputeReason: order.disputeReason ?? null,
    disputeResolvedNote: order.disputeResolvedNote ?? null,

    listingId: order.listingId,
    inspectionId: order.inspectionId,
    car: listing
      ? {
          title: listing.title,
          vin: listing.vin ?? null,
          photo: listing.photos?.[0] ?? null,
          province: listing.province ?? null,
          mileageKm: listing.mileageKm ?? null,
        }
      : null,

    supplierId: order.supplierId,
    store: supplier
      ? {
          id: supplier._id!,
          name: supplier.storeName,
          province: supplier.province ?? '',
          ...(includeContact ? { phone: supplier.phone } : {}),
        }
      : null,

    buyerId: order.buyerId,
    buyer: buyer
      ? {
          id: buyer._id!,
          name: buyer.name,
          ...(includeContact ? { email: buyer.email } : {}),
        }
      : null,
  };
}
