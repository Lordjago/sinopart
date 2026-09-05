import type {
  Order,
  OrderEscrow,
  OrderMoney,
} from '../../core/domain/entities/order';
import { OrderStatus } from '../../core/domain/entities/order';
import { idOf } from './ref.util';

export class OrderMapper {
  static toDomain(document: any): Order | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      reference: raw.reference,
      listingId: idOf(raw.listingId)!,
      supplierId: idOf(raw.supplierId)!,
      buyerId: idOf(raw.buyerId)!,
      inspectionId: idOf(raw.inspectionId)!,
      status: raw.status,
      money: { ...(raw.money ?? {}) } as OrderMoney,
      currency: raw.currency,
      escrow: {
        releaseOnLoading: raw.escrow?.releaseOnLoading ?? 0,
        holdback: raw.escrow?.holdback ?? 0,
        releasedAt: raw.escrow?.releasedAt ?? null,
        holdbackReleasedAt: raw.escrow?.holdbackReleasedAt ?? null,
      } as OrderEscrow,
      paidAt: raw.paidAt,
      paymentReference: raw.paymentReference ?? null,
      preparedAt: raw.preparedAt ?? null,
      loadedAt: raw.loadedAt ?? null,
      vinVerifiedAt: raw.vinVerifiedAt ?? null,
      arrivedAt: raw.arrivedAt ?? null,
      clearedAt: raw.clearedAt ?? null,
      deliveredAt: raw.deliveredAt ?? null,
      completedAt: raw.completedAt ?? null,
      cancelledAt: raw.cancelledAt ?? null,
      trackingNote: raw.trackingNote ?? null,
      trackingReference: raw.trackingReference ?? null,
      etaAt: raw.etaAt ?? null,
      disputeReason: raw.disputeReason ?? null,
      disputeResolvedNote: raw.disputeResolvedNote ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Order;
  }

  static toPersistence(order: Partial<Order>): Record<string, any> {
    return {
      reference: order.reference,
      listingId: order.listingId,
      supplierId: order.supplierId,
      buyerId: order.buyerId,
      inspectionId: order.inspectionId,
      status: order.status ?? OrderStatus.SECURING,
      money: order.money,
      currency: order.currency ?? 'NGN',
      escrow: order.escrow,
      paidAt: order.paidAt,
      paymentReference: order.paymentReference ?? null,
    };
  }

  /**
   * Only the keys present, so advancing a stage never wipes a tracking note or
   * an earlier milestone. `money` is absent on purpose: the figures are agreed
   * at purchase and there is no path that should rewrite them.
   */
  static toUpdate(patch: Partial<Order>): Record<string, any> {
    const out: Record<string, any> = {};
    const fields: (keyof Order)[] = [
      'status',
      'escrow',
      'preparedAt',
      'loadedAt',
      'vinVerifiedAt',
      'arrivedAt',
      'clearedAt',
      'deliveredAt',
      'completedAt',
      'cancelledAt',
      'trackingNote',
      'trackingReference',
      'etaAt',
      'disputeReason',
      'disputeResolvedNote',
      'paymentReference',
    ];
    for (const f of fields) {
      if (patch[f] !== undefined) out[f] = patch[f];
    }
    return out;
  }
}
