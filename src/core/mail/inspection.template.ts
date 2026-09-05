/**
 * D11–D17: the inspection a dealer paid for, from booking to its outcome.
 * ---------------------------------------------------------------------------
 * All of them go to the BUYER. They are one family because they share the same
 * facts (which car, which order, what it cost) and the same reading order:
 * what just happened, what it means for the money, what happens next.
 *
 * The car title and the store's note are supplier-authored text, so everything
 * interpolated here goes through the escaping in `layout`.
 */
import type { Email } from '../interfaces/services/mail.service';
import {
  LINK,
  button,
  detailPanel,
  heading,
  escapeHtml,
  layout,
  paragraph,
} from './layout';
import { formatDeadline, formatNaira } from './format';

/** What every mail in this family needs to name the car and the order. */
export interface InspectionMailBase {
  to: string;
  /** The listing title, e.g. "2021 Toyota Corolla LE". */
  car: string;
  /** The inspection reference shown to the buyer, e.g. "INS-26-0912". */
  reference: string;
  /** The id the status page is keyed by — NOT the reference. */
  inspectionId: string;
  vin?: string | null;
}

const trackButton = (inspectionId: string) =>
  button('Track your inspection', LINK.inspection(inspectionId));

/* -------------------------------------------------------------------------
   D11 — Inspection booked
   ------------------------------------------------------------------------- */

export interface InspectionBookedInput extends InspectionMailBase {
  /** In naira. */
  fee: number;
  /** When the hold on the car lapses. */
  reservedUntil: Date;
  /** Where the car is, so they know where the inspector is going. */
  supplierProvince?: string | null;
  paidAt?: Date;
}

export function inspectionBookedTemplate(input: InspectionBookedInput): Email {
  const {
    to,
    car,
    reference,
    inspectionId,
    vin,
    fee,
    reservedUntil,
    supplierProvince,
    paidAt = new Date(),
  } = input;

  const money = formatNaira(fee);
  const safeCar = escapeHtml(car);

  /* Where the inspector is going. Province is optional on a listing, so the
     sentence is built two ways rather than printing "in undefined". */
  const whereClause = supplierProvince
    ? `An inspector goes to the car in ${escapeHtml(supplierProvince)} and checks it point by point against the VIN.`
    : 'An inspector goes to the car and checks it point by point against the VIN.';

  const body = `
      ${heading('Your inspection is booked')}
      ${paragraph(`We have your ${escapeHtml(money)} and the ${safeCar} is off the market for you until <strong>${escapeHtml(formatDeadline(reservedUntil))}</strong>.`)}
      ${paragraph(`${whereClause} The report reaches you within 48 hours.`)}
      ${paragraph('Your fee comes off the price of the car if you buy it. If the car fails, you get all of it back.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Paid', `${money} · ${formatDeadline(paidAt)}`],
      ])}
      ${trackButton(inspectionId)}
  `;

  const subject = `Inspection booked. Your ${car} is held for 72 hours`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: `${money} received. We are sending an inspector.`,
      body,
    }),
    tag: 'inspection-booked',
  };
}

/* -------------------------------------------------------------------------
   D12 — The store agreed to the visit
   ------------------------------------------------------------------------- */

export function inspectionAcceptedTemplate(input: InspectionMailBase): Email {
  const { to, car, reference, inspectionId, vin } = input;

  const body = `
      ${heading('The visit is on')}
      ${paragraph(`The store has agreed to open the ${escapeHtml(car)} for our inspector. We are scheduling the visit now.`)}
      ${paragraph('Your report comes within 48 hours of the inspection.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
      ])}
      ${trackButton(inspectionId)}
  `;

  const subject = 'The store agreed. Your inspection is being scheduled';

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: `An inspector is on the way to your ${car}.`,
      body,
    }),
    tag: 'inspection-accepted',
  };
}

/* -------------------------------------------------------------------------
   D13 — The store declined, you are refunded
   ------------------------------------------------------------------------- */

export interface InspectionDeclinedInput extends InspectionMailBase {
  fee: number;
  /** The store's own words. Required of them, so usually present. */
  supplierNote?: string | null;
}

export function inspectionDeclinedTemplate(
  input: InspectionDeclinedInput,
): Email {
  const { to, car, reference, vin, fee, supplierNote } = input;

  const money = formatNaira(fee);

  /* The store's reason is the only explanation the buyer gets for a paid
     inspection going nowhere, so it is shown verbatim rather than summarised
     — inside the panel, where it reads as quoted rather than as our words. */
  const body = `
      ${heading('The store could not show the car')}
      ${paragraph(`The store has declined the visit on the ${escapeHtml(car)}, so the inspection will not go ahead and the car is back on the market.`)}
      ${paragraph(`Your ${escapeHtml(money)} is coming back to you in full. Nothing was spent: no inspector travelled.`)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Refund', money],
        ['Store said', supplierNote],
      ])}
      ${paragraph('Refunds usually land within 5 to 10 working days, depending on your bank.')}
      ${button('Find another car', LINK.browse)}
  `;

  const subject = `Your ${money} is coming back. The store could not show the car`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: `The ${car} is off. Your money is on its way back.`,
      body,
    }),
    tag: 'inspection-declined',
  };
}
/* -------------------------------------------------------------------------
   D14 — Our inspector is at the car
   ------------------------------------------------------------------------- */

export interface InspectionVisitInput extends InspectionMailBase {
  supplierProvince?: string | null;
}

export function inspectionVisitTemplate(input: InspectionVisitInput): Email {
  const { to, car, reference, inspectionId, vin, supplierProvince } = input;

  const safeCar = escapeHtml(car);
  const where = supplierProvince
    ? `Our inspector is at the ${safeCar} in ${escapeHtml(supplierProvince)}, going through it point by point and photographing everything.`
    : `Our inspector is at the ${safeCar}, going through it point by point and photographing everything.`;

  const body = `
      ${heading('The inspection is happening')}
      ${paragraph(where)}
      ${paragraph('Your report reaches you within 48 hours.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
      ])}
      ${trackButton(inspectionId)}
  `;

  const subject = `Our inspector is at your ${car} now`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Point-by-point check under way. Report within 48 hours.',
      body,
    }),
    tag: 'inspection-visit',
  };
}

/* -------------------------------------------------------------------------
   D16 — It passed, your report is ready
   ------------------------------------------------------------------------- */

export interface InspectionPassedInput extends InspectionMailBase {
  /** The inspection fee, which now counts toward the car. */
  fee: number;
  /** When the hold lapses. This is the real, enforced decision deadline. */
  decideBy: Date;
}

export function inspectionPassedTemplate(input: InspectionPassedInput): Email {
  const { to, car, reference, inspectionId, vin, fee, decideBy } = input;

  const deadline = formatDeadline(decideBy);
  const money = formatNaira(fee);

  /* The design also shows "car and freight", "due now" and a clearance line.
     Those are landed-cost figures the API does not produce yet — the importer
     estimates them client-side — so they are left out rather than guessed at.
     A wrong number in an email about money is worse than a missing one. */
  const body = `
      ${heading('Your report is ready')}
      ${paragraph(`The ${escapeHtml(car)} passed inspection. Everything the inspector found is in the report, with photographs.`)}
      ${paragraph(`Read it, then decide. <strong>You have until ${escapeHtml(deadline)}.</strong> The car stays held for you until then.`)}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Inspection fee', `${money} credited`],
        ['Decide by', deadline],
      ])}
      ${button('Read your report', LINK.inspection(inspectionId))}
  `;

  const subject = `Your ${car} passed. You have 48 hours to decide`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: `The report is ready. Decide by ${deadline}.`,
      body,
    }),
    tag: 'inspection-passed',
  };
}

/* -------------------------------------------------------------------------
   D17 — It did not pass, you are refunded
   ------------------------------------------------------------------------- */

export interface InspectionFailedInput extends InspectionMailBase {
  fee: number;
}

export function inspectionFailedTemplate(input: InspectionFailedInput): Email {
  const { to, car, reference, inspectionId, vin, fee } = input;

  const money = formatNaira(fee);

  const body = `
      ${heading(`We are refunding your ${escapeHtml(money)}`)}
      ${paragraph(`The ${escapeHtml(car)} did not pass inspection, so you are not buying it and you are not paying for it. The full ${escapeHtml(money)} goes back to your registered account within 3 business days.`)}
      ${paragraph('The report shows exactly what the inspector found and why it failed. Worth reading. It is the same check every car gets.')}
      ${detailPanel([
        ['Order', reference],
        ['Car', car],
        ['VIN', vin],
        ['Refund', money],
      ])}
      ${button('See what we found', LINK.inspection(inspectionId))}
      ${paragraph('Ada can line up another car in the same range. Reply to this email and she will.', 0)}
  `;

  const subject = `Your ${money} is coming back. The ${car} did not pass`;

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Full refund in 3 business days. Here is what we found.',
      body,
    }),
    tag: 'inspection-failed',
  };
}
