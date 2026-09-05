/**
 * D22–D35: the order, from payment through loading, clearance and delivery,
 * to the dealer closing it out.
 * ---------------------------------------------------------------------------
 * Both go to the BUYER, and both keep answering the same anxious question: a
 * dealer has paid a lot of money for a car they have never seen, so each one
 * says where the money is and what is checked before any of it moves.
 */
import type { Email } from '../interfaces/services/mail.service';
import {
  LINK,
  bullets,
  button,
  detailPanel,
  escapeHtml,
  heading,
  layout,
  paragraph,
} from './layout';
import { formatDeadline, formatNaira } from './format';

export interface OrderPlacedInput {
  to: string;
  car: string;
  /** The order reference, e.g. "SP-ORD-02312". */
  reference: string;
  orderId: string;
  vin?: string | null;
  /** Vehicle + freight + fees, before the inspection credit. */
  subtotal: number;
  /** The inspection fee, now counting toward the car. */
  inspectionCredit: number;
  /** What was actually charged: subtotal minus the credit. */
  dueNow: number;
}

export function orderPlacedTemplate(input: OrderPlacedInput): Email {
  const {
    to,
    car,
    reference,
    orderId,
    vin,
    subtotal,
    inspectionCredit,
    dueNow,
  } = input;

  const paid = formatNaira(dueNow);

  /* Duty is deliberately not a number here. It is a third party's charge,
     collected in Nigeria at whatever the real figure turns out to be, and
     quoting an estimate in a payment confirmation invites an argument later. */
  const body = `
      ${heading('Your order is open')}
      ${paragraph(`We have your ${escapeHtml(paid)} and the ${escapeHtml(car)} is yours. The store is preparing it now.`)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Car and freight', formatNaira(subtotal)],
        ['Inspection fee', `${formatNaira(inspectionCredit)} credited`],
        ['Paid now', paid],
        ['Clearance', 'due on arrival, at the actual figure'],
      ])}
      ${paragraph('Nothing has been paid out to the store yet. That happens when we check the car at loading, against the report you have.')}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Payment received. Your ${car} is on order`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: `${paid} received. Clearance comes later, on arrival.`,
      body,
    }),
    tag: 'order-placed',
  };
}

/* -------------------------------------------------------------------------
   D23 — The store is preparing your car
   ------------------------------------------------------------------------- */

export interface OrderPreparingInput {
  to: string;
  car: string;
  reference: string;
  orderId: string;
  vin?: string | null;
}

/**
 * Sent when the store says the car is ready to leave the yard.
 *
 * The second paragraph is doing the real work. This is the point where a
 * dealer has paid a lot of money for a car they have never seen and is
 * furthest from any evidence, so it spells out exactly what we check at
 * loading and says plainly that the store has not been paid yet.
 */
export function orderPreparingTemplate(input: OrderPreparingInput): Email {
  const { to, car, reference, orderId, vin } = input;

  const body = `
      ${heading('The store is preparing your car')}
      ${paragraph(`The ${escapeHtml(car)} is being made ready for the port. Paperwork, cleaning, and getting it to the loading point.`)}
      ${paragraph('Next we check it before it goes on the ship: the VIN against your report, the same key angles the inspector photographed, the odometer, and any new damage. Nothing is paid out to the store until it passes.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
      ])}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Your ${car} is being prepared for shipping`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Next step is the loading check.',
      body,
    }),
    tag: 'order-preparing',
  };
}

/* -------------------------------------------------------------------------
   D24 — Loaded, checked, on its way
   ------------------------------------------------------------------------- */

export interface OrderShippedInput extends OrderPreparingInput {
  vessel?: string | null;
  etaAt?: Date | null;
}

/**
 * The most important email in the shipping run. It is the moment the store
 * gets paid, so it has to show its working: what was checked, and against
 * what. The bullets are the product promise being kept.
 */
export function orderShippedTemplate(input: OrderShippedInput): Email {
  const { to, car, reference, orderId, vin, vessel, etaAt } = input;

  const vinLine = vin
    ? `VIN ${escapeHtml(vin)} matches the car that was inspected`
    : 'The VIN matches the car that was inspected';

  const body = `
      ${heading('Loaded and on the water')}
      ${paragraph(`Before your ${escapeHtml(car)} went on the ship we checked it against the report you paid for.`)}
      ${bullets([
        vinLine,
        'The same key angles the inspector photographed, checked again',
        'The odometer, and any damage that was not there before',
      ])}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['Vessel', vessel],
        ['ETA', etaAt ? formatDeadline(etaAt) : null],
      ])}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Your ${car} passed the loading check and is on its way`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'VIN, condition and odometer all match your report.',
      body,
    }),
    tag: 'order-shipped',
  };
}

/* -------------------------------------------------------------------------
   D25 — Stopped at the loading check
   ------------------------------------------------------------------------- */

export interface OrderStoppedInput extends OrderPreparingInput {
  /** Why we stopped it. The back office's note on the order. */
  reason?: string | null;
}

export function orderStoppedTemplate(input: OrderStoppedInput): Email {
  const { to, car, reference, orderId, vin, reason } = input;

  const body = `
      ${heading('We stopped this car before it shipped')}
      ${paragraph(`The ${escapeHtml(car)} did not match the report you paid for when we checked it at loading.`)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['What we found', reason],
      ])}
      ${paragraph('Your money has not gone anywhere. Nothing was released to the store and the car has not been loaded.')}
      ${paragraph('This is exactly what the check is for. We will come back to you with what happens next.')}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `We stopped your ${car} at loading. Your money is untouched`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'It did not match your report. Nothing has been paid out.',
      body,
    }),
    tag: 'order-stopped',
  };
}

/* -------------------------------------------------------------------------
   D26 — Shipping update
   ------------------------------------------------------------------------- */

export interface OrderUpdateInput extends OrderPreparingInput {
  /** The back office's own words. This email exists to carry them. */
  note: string;
  vessel?: string | null;
  etaAt?: Date | null;
}

/**
 * The catch-all for movement between loading and landing.
 *
 * The note IS the email — there is no generated copy to pad it out, because
 * anything we invent here would be less accurate than what the agent wrote.
 * Callers must not send this without a note; there would be nothing to say.
 */
export function orderUpdateTemplate(input: OrderUpdateInput): Email {
  const { to, car, reference, orderId, note, vessel, etaAt } = input;

  const body = `
      ${heading('Shipping update')}
      ${paragraph(escapeHtml(note))}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['Vessel', vessel],
        ['ETA', etaAt ? formatDeadline(etaAt) : null],
      ])}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Update on your ${car}`;

  return {
    to,
    subject,
    html: layout({ title: subject, preheader: note, body }),
    tag: 'order-update',
  };
}

/* -------------------------------------------------------------------------
   D27 — Your car has landed
   ------------------------------------------------------------------------- */

export function orderLandedTemplate(input: OrderPreparingInput): Email {
  const { to, car, reference, orderId, vin } = input;

  const body = `
      ${heading('Your car is in Lagos')}
      ${paragraph(`The ${escapeHtml(car)} arrived at port. Clearance is the next step, and our agent is working out the exact duty now.`)}
      ${paragraph('You have 7 days from arrival to clear it before the port starts charging storage. We will send you the figure shortly.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
      ])}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Your ${car} has landed in Lagos`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Clearance is next. We will send the exact figure.',
      body,
    }),
    tag: 'order-landed',
  };
}

/* -------------------------------------------------------------------------
   D28 — Clearance is due
   ------------------------------------------------------------------------- */

export interface OrderClearanceDueInput extends OrderPreparingInput {
  duty: number;
  vat: number;
  agentFees: number;
  /** What the agent actually billed. Not derived — see ClearanceDto. */
  total: number;
  /** What we guessed at purchase, for comparison. */
  estimate?: number | null;
  graceDeadline?: Date | null;
}

/**
 * The one email in this run that asks a dealer for more money, so it is built
 * to survive suspicion: the breakdown is itemised, the estimate we quoted at
 * purchase sits next to the real figure so nobody has to go hunting for it,
 * and the copy says plainly that we are not marking it up.
 */
export function orderClearanceDueTemplate(
  input: OrderClearanceDueInput,
): Email {
  const {
    to,
    car,
    reference,
    orderId,
    vin,
    duty,
    vat,
    agentFees,
    total,
    estimate,
    graceDeadline,
  } = input;

  const money = formatNaira(total);

  const graceLine = graceDeadline
    ? `Pay it and the car is released to you. You have until <strong>${escapeHtml(formatDeadline(graceDeadline))}</strong>, after which the port charges storage and that cost passes to you.`
    : 'Pay it and the car is released to you. Until it is paid the port will eventually charge storage, and that cost passes to you.';

  const body = `
      ${heading('Clearance is due')}
      ${paragraph(`Duty and clearance on the ${escapeHtml(car)} come to <strong>${escapeHtml(money)}</strong>. That is the actual figure our agent is paying, not an estimate and not marked up.`)}
      ${detailPanel([
        ['Order', reference],
        ['VIN', vin],
        ['Duty', formatNaira(duty)],
        ['VAT', formatNaira(vat)],
        ['Agent and port', formatNaira(agentFees)],
        ['Total', money],
        ['Estimated at purchase', estimate ? formatNaira(estimate) : null],
      ])}
      ${paragraph(graceLine)}
      ${button('Pay clearance', LINK.clearance(orderId))}
  `;

  const subject = `Clearance on your ${car} is ${money}`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'The real figure from the agent. Pay to release the car.',
      body,
    }),
    tag: 'order-clearance-due',
  };
}

/* -------------------------------------------------------------------------
   D31 — Clearance paid, under way
   ------------------------------------------------------------------------- */

export interface OrderClearingInput extends OrderPreparingInput {
  /** What was paid, so the receipt reads back the figure. */
  clearanceTotal?: number | null;
}

export function orderClearingTemplate(input: OrderClearingInput): Email {
  const { to, car, reference, orderId, vin, clearanceTotal } = input;

  const paid = clearanceTotal != null ? formatNaira(clearanceTotal) : null;

  const body = `
      ${heading('Clearance is paid')}
      ${paragraph(
        paid
          ? `We have your ${escapeHtml(paid)} and our agent is clearing the ${escapeHtml(car)} through customs now.`
          : `Our agent is clearing the ${escapeHtml(car)} through customs now.`,
      )}
      ${paragraph('Once it is out we arrange handover to you.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Clearance paid', paid],
      ])}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Clearance paid. Your ${car} is being cleared`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'The agent is working. Delivery next.',
      body,
    }),
    tag: 'order-clearing',
  };
}

/* -------------------------------------------------------------------------
   D32 — Out of customs
   ------------------------------------------------------------------------- */

export function orderClearedTemplate(input: OrderPreparingInput): Email {
  const { to, car, reference, orderId, vin } = input;

  const body = `
      ${heading('Your car is out of customs')}
      ${paragraph(`The ${escapeHtml(car)} has cleared customs. We are arranging handover to you now and will confirm the details shortly.`)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
      ])}
      ${button('Track your order', LINK.order(orderId))}
  `;

  const subject = `Your ${car} is out of customs`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Cleared. We are arranging handover.',
      body,
    }),
    tag: 'order-cleared',
  };
}

/* -------------------------------------------------------------------------
   D33 — Delivered, check it against your report
   ------------------------------------------------------------------------- */

export interface OrderDeliveredInput extends OrderPreparingInput {
  /** The passed inspection, so "open my report" goes somewhere useful. */
  inspectionId?: string | null;
  /** Last day to raise a mismatch. After this the order closes itself. */
  disputeDeadline?: Date | null;
}

/**
 * The email the whole product rests on.
 *
 * Everything before this was us telling a dealer things. This one asks them to
 * do something, in a window that expires — so the instruction is concrete
 * ("walk around the car with the report"), and the deadline appears twice:
 * once in the sentence and once as a row they can find again later.
 */
export function orderDeliveredTemplate(input: OrderDeliveredInput): Email {
  const { to, car, reference, orderId, vin, inspectionId, disputeDeadline } =
    input;

  const deadline = disputeDeadline ? formatDeadline(disputeDeadline) : null;

  const closingLine = deadline
    ? `If it does not, tell us within 7 days and we take it up. That window closes <strong>${escapeHtml(deadline)}</strong>, and the order closes with it.`
    : 'If it does not, tell us within 7 days and we take it up. When that window closes, the order closes with it.';

  const body = `
      ${heading('Your car is here')}
      ${paragraph(`The ${escapeHtml(car)} has been handed over to you.`)}
      ${paragraph('Now do the one thing that matters. Open your inspection report and walk around the car with it. Every point the inspector recorded, check it yourself.')}
      ${paragraph('If it matches, confirm it and we close the order.')}
      ${paragraph(closingLine)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Raise anything by', deadline],
      ])}
      ${button(
        inspectionId ? 'Open my report' : 'Open my order',
        inspectionId ? LINK.inspection(inspectionId) : LINK.order(orderId),
      )}
  `;

  const subject = `Your ${car} is delivered. Check it against your report`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'You have 7 days to raise anything that does not match.',
      body,
    }),
    tag: 'order-delivered',
  };
}

/* -------------------------------------------------------------------------
   D35 — Order complete
   ------------------------------------------------------------------------- */

export interface OrderCompleteInput extends OrderPreparingInput {
  /** The dealer's name; only the first word is used. */
  name?: string | null;
}

export function orderCompleteTemplate(input: OrderCompleteInput): Email {
  const { to, car, reference, orderId, vin, name } = input;

  const first = String(name ?? '')
    .trim()
    .split(/\s+/)[0];

  const body = `
      ${heading(first ? `That is one done, ${first}` : 'That is one done')}
      ${paragraph(`The ${escapeHtml(car)} is yours and the order is closed. Every document is in your account: the receipt, the inspection report, and the clearance papers.`)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
      ])}
      ${button('Download your documents', LINK.order(orderId))}
      ${paragraph('Ready for the next one? Reply and tell Ada what you are looking for.', 0)}
  `;

  const subject = `Your ${car} order is complete`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Documents are ready to download.',
      body,
    }),
    tag: 'order-complete',
  };
}
