import { BaseDomain } from './base.domain';

/**
 * A car a dealer has bought, and its journey from the yard to their hands.
 *
 *   securing ──loaded, VIN verified──▶ in_transit ──arrives──▶ at_port
 *      │                                                          │
 *      │                                                    cleared│
 *      ▼                                                          ▼
 *   cancelled                          completed ◀──confirmed── delivered
 *                                          ▲                      │
 *                                          └───resolved───── disputed
 *
 * An order only exists after a PASSED inspection has been paid for. That is the
 * whole shape of the product: nobody buys a car here without a report on it, so
 * the order carries the inspection that qualified it and cannot be created
 * without one.
 *
 * Money is SNAPSHOTTED at purchase, never recomputed. The FX rate and the fee
 * percentages are operator-editable, and a dealer who agreed to a figure on
 * Tuesday must still owe that figure on Friday. Re-deriving the total from
 * today's rates would silently rewrite a completed contract.
 */
export enum OrderStatus {
  /** Paid. The store is preparing the car for VIN-verified loading. */
  SECURING = 'securing',
  /** Loaded and on the water. 85% of the escrow has gone to the store. */
  IN_TRANSIT = 'in_transit',
  /** Landed. Waiting on duty and clearance, which the dealer pays on arrival. */
  AT_PORT = 'at_port',
  /** Clearance paid, agent working it through customs. */
  CLEARING = 'clearing',
  /** Out of customs. Waiting on handover to the dealer. */
  CLEARED = 'cleared',
  /** Handed over. The dealer has the car but has not confirmed it yet. */
  DELIVERED = 'delivered',
  /** Dealer confirmed it matches the report. The 15% holdback releases. */
  COMPLETED = 'completed',
  /** Dealer says it does not match the report. Blocks the holdback. */
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

/** The order of the stages, for a progress bar that cannot drift from the enum. */
export const ORDER_FLOW: readonly OrderStatus[] = [
  OrderStatus.SECURING,
  OrderStatus.IN_TRANSIT,
  OrderStatus.AT_PORT,
  OrderStatus.CLEARING,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

/** Statuses where the car is still in motion and money is still at stake. */
export const ACTIVE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.SECURING,
  OrderStatus.IN_TRANSIT,
  OrderStatus.AT_PORT,
  OrderStatus.CLEARING,
  OrderStatus.DELIVERED,
  OrderStatus.DISPUTED,
]);

/** What the back office may move an order to, from where. */
export const ORDER_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  [OrderStatus.SECURING]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.AT_PORT],
  [OrderStatus.AT_PORT]: [OrderStatus.CLEARING],
  [OrderStatus.CLEARING]: [OrderStatus.CLEARED],
  [OrderStatus.CLEARED]: [OrderStatus.DELIVERED],
  // Completing is the DEALER's word, not ours: see ConfirmDeliveryUseCase.
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
  [OrderStatus.DISPUTED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * What the dealer owes and when, fixed at the moment of purchase.
 *
 * Two payments, deliberately separated: everything settled in China is paid up
 * front, and duty is paid on arrival at the real figure from a licensed agent.
 * Bundling them would mean quoting a duty estimate as if it were a price.
 */
export interface OrderMoney {
  /** The car itself, in naira at the rate agreed on the day. */
  vehicle: number;
  freight: number;
  /** Sinopart's cut. */
  fees: number;
  /** vehicle + freight + fees. */
  subtotal: number;
  /**
   * The inspection fee already paid, credited against the purchase. This is
   * the promise the inspection screen makes ("your fee counts toward the car"),
   * kept here so the credit is part of the contract rather than a UI flourish.
   */
  inspectionCredit: number;
  /** subtotal - inspectionCredit. What the dealer actually pays today. */
  dueNow: number;
  /** Payable in Nigeria on arrival, at the agent's real figure. */
  dutyEstimate: number;
}

/**
 * What clearance actually cost, once the agent has the real numbers.
 *
 * Deliberately separate from `OrderMoney`, which is snapshotted at purchase
 * and must never move. This arrives later, from a licensed agent handling a
 * specific consignment, and it is the figure the dealer is asked to pay — so
 * the two are never mixed up. `money.dutyEstimate` is what we guessed; this is
 * what it came to.
 */
export interface OrderClearance {
  duty: number;
  vat: number;
  /** The agent's own fee plus port charges. */
  agentFees: number;
  /** duty + vat + agentFees. What the dealer pays to release the car. */
  total: number;
  /** When the port starts charging storage. */
  graceDeadline?: Date | null;
  /** When the dealer paid it. */
  paidAt?: Date | null;
}

/**
 * How the money moves to the store: most on proof of loading, the rest once the
 * dealer confirms the car. The holdback is what makes the VIN check mean
 * something, so it is part of the order, not a policy note.
 */
export interface OrderEscrow {
  /** Released to the store when loading is VIN-verified. */
  releaseOnLoading: number;
  /** Held until the dealer confirms delivery. */
  holdback: number;
  releasedAt?: Date | null;
  holdbackReleasedAt?: Date | null;
}

export class Order extends BaseDomain {
  /** Human reference, quoted by all three parties. */
  reference: string;

  listingId: string;
  supplierId: string;
  buyerId: string;
  /** The passed inspection that made this purchase possible. */
  inspectionId: string;

  status: OrderStatus;

  money: OrderMoney;
  currency: string;
  escrow: OrderEscrow;

  paidAt: Date;
  /** Set once a gateway is charging. Null while payment is simulated. */
  paymentReference?: string | null;

  // Milestones. Absent until reached, so a timeline shows only what happened.
  /**
   * The store saying the car is ready for collection. Not a status: the order
   * stays SECURING until the back office actually loads it, because a store
   * declaring itself ready is not the same event as a VIN-verified loading,
   * and only the second one releases money.
   */
  preparedAt?: Date | null;
  loadedAt?: Date | null;
  /** When we confirmed the loaded car is the inspected car. */
  vinVerifiedAt?: Date | null;
  arrivedAt?: Date | null;
  /** Clearance paid, agent engaged. */
  clearingStartedAt?: Date | null;
  /** Out of customs. */
  clearedAt?: Date | null;
  deliveredAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;

  /** Where the car is, in the back office's words. Shown to both parties. */
  trackingNote?: string | null;
  /** Vessel or waybill, once it exists. */
  trackingReference?: string | null;
  /** Expected arrival, as told to us by the freight agent. */
  etaAt?: Date | null;

  /** The real clearance bill, once the agent has worked it out. */
  clearance?: OrderClearance | null;

  /** Why the dealer disputed, and how it was settled. */
  disputeReason?: string | null;
  disputeResolvedNote?: string | null;
}

/**
 * "SP-ORD-02312". Matches the reference format the order screens already show,
 * so a mock reference and a real one are indistinguishable in a screenshot.
 */
export function buildOrderRef(random: number): string {
  const tail = String(Math.floor(random * 100000)).padStart(5, '0');
  return `SP-ORD-${tail}`;
}

/**
 * Split a purchase into what is owed now and what is held back.
 *
 * `inspectionCredit` is subtracted from the subtotal, never from duty: duty is
 * a third party's charge collected on arrival, and crediting against it would
 * mean quietly under-collecting from the agent.
 */
export function buildOrderMoney(
  parts: { vehicle: number; freight: number; fees: number; duty: number },
  inspectionCredit: number,
): OrderMoney {
  const subtotal = parts.vehicle + parts.freight + parts.fees;
  // A credit larger than the bill leaves nothing to pay, never a negative.
  const credit = Math.min(Math.max(inspectionCredit, 0), subtotal);
  return {
    vehicle: parts.vehicle,
    freight: parts.freight,
    fees: parts.fees,
    subtotal,
    inspectionCredit: credit,
    dueNow: subtotal - credit,
    dutyEstimate: parts.duty,
  };
}

/** The escrow split for a paid subtotal, at the operator's release percentage. */
export function buildEscrow(subtotal: number, releasePct: number): OrderEscrow {
  const pct = Number.isFinite(releasePct) ? Math.min(Math.max(releasePct, 0), 1) : 0.85;
  const releaseOnLoading = Math.round(subtotal * pct);
  return {
    releaseOnLoading,
    holdback: subtotal - releaseOnLoading,
    releasedAt: null,
    holdbackReleasedAt: null,
  };
}
