import { BaseDomain } from './base.domain';

/**
 * One buyer's paid inspection of one car, and its lifecycle.
 *
 *   paid ──supplier accepts──▶ accepted ──inspector visits──▶ in_progress
 *     │                            │                              │
 *     │                            │                    report ───┴──▶ passed
 *     └──supplier declines──▶ declined                             └──▶ failed
 *
 * Paying is what reserves the car: the listing moves to RESERVED the moment an
 * inspection is created, and comes back to AVAILABLE if the supplier declines or
 * the buyer cancels. That reservation is the product promise ("no one else can
 * inspect or buy it while you decide"), so it is a state transition rather than
 * a flag anyone has to remember to set.
 *
 * The supplier's accept step is real, not ceremony: an inspector is being sent
 * to a physical yard, and the store has to agree to receive them.
 */
export enum InspectionStatus {
  /** Paid for. Waiting on the store to agree to the yard visit. */
  PAID = 'paid',
  /** Store agreed. Waiting on an inspector to attend. */
  ACCEPTED = 'accepted',
  /** Store refused the visit. The car goes back on the market. */
  DECLINED = 'declined',
  /** Inspector is working on it. */
  IN_PROGRESS = 'in_progress',
  PASSED = 'passed',
  FAILED = 'failed',
  /** Buyer walked away before the inspection ran. */
  CANCELLED = 'cancelled',
}

/** How long paying holds the car for. */
export const RESERVATION_HOURS = 72;

/** Statuses where the car is still held off the market for this buyer. */
export const HOLDS_THE_CAR: ReadonlySet<InspectionStatus> = new Set([
  InspectionStatus.PAID,
  InspectionStatus.ACCEPTED,
  InspectionStatus.IN_PROGRESS,
  InspectionStatus.PASSED,
]);

/** Statuses a supplier may still accept or decline from. */
export const AWAITING_SUPPLIER: ReadonlySet<InspectionStatus> = new Set([
  InspectionStatus.PAID,
]);

/** Statuses an inspector may file a report against. */
export const REPORTABLE_STATUSES: ReadonlySet<InspectionStatus> = new Set([
  InspectionStatus.ACCEPTED,
  InspectionStatus.IN_PROGRESS,
]);

/** Statuses the buyer may still walk away from without a report. */
export const CANCELLABLE_STATUSES: ReadonlySet<InspectionStatus> = new Set([
  InspectionStatus.PAID,
  InspectionStatus.ACCEPTED,
]);

/** What a checked area can land on. Drives the colour of the buyer's row. */
export const SECTION_STATES = ['pass', 'attention', 'fail'] as const;
export type SectionState = (typeof SECTION_STATES)[number];

/**
 * One checked area of the car. The section list is not fixed in the domain:
 * what an inspector checks on a diesel pickup differs from an EV, so the report
 * carries whatever sections were actually filled in.
 *
 * `note` is meaningful on EVERY state, passes included. A panel can be sound,
 * straight and evenly finished — a pass on "body and paint" — and still not be
 * wearing the factory's own paint. That is not a defect to fail a car over, but
 * it changes what the car is worth to a dealer, so the inspector has to be able
 * to say it on a row that passed. See `collectAdvisories`.
 */
export interface InspectionSection {
  key: string;
  label: string;
  state: SectionState;
  note?: string | null;
  /**
   * Which heading this row sits under on the report sheet. Grouped rather than
   * flat because a dealer reads the sheet by system: everything mechanical
   * together, then electronics, then body. A flat list of twelve rows makes
   * them hunt.
   */
  group?: string | null;
}

/**
 * The headings the report sheet prints, in order.
 *
 * Kept in the domain so the form an inspector fills in and the sheet a dealer
 * reads cannot drift into different groupings of the same checks.
 */
export const SECTION_GROUPS = [
  "Mechanical & drive",
  "Electronics",
  "Body, structure & interior",
] as const;

/**
 * What the records say, as against what the inspector saw.
 *
 * Separate from the physical checks on purpose: this is third-party history
 * (claims, servicing, odometer trail), and a dealer weighs it differently from
 * something an inspector confirmed with their own hands. Every field is
 * optional because not every market has a records provider.
 */
export interface InspectionHistory {
  accidentRecords?: number | null;
  insuranceClaims?: number | null;
  /** What the claim was, when there is one: "minor, 2023". */
  claimNote?: string | null;
  maintenanceRecords?: number | null;
  /** Whether the odometer trail is consistent across the records. */
  odometerIntegrity?: boolean | null;
  /** Who the records came from, e.g. "che300". */
  source?: string | null;
}

/**
 * One piece of evidence, with what it shows.
 *
 * Labelled rather than a bare URL: "Odometer" and "VIN plate" are the two
 * photos that make the mileage and identity claims checkable, and a dealer
 * scrolling eight unlabelled thumbnails cannot tell which is which.
 */
export interface InspectionEvidence {
  url: string;
  label: string;
  /** "photo" | "video". A walkaround clip sits alongside the stills. */
  kind: "photo" | "video";
}

/**
 * The evidence the report sheet has a place for, in the order it prints them.
 *
 * A named list rather than "upload some photos", because several are
 * load-bearing: the odometer shot is what makes the mileage claim checkable,
 * the VIN plate ties the report to this car and not a similar one, and the
 * walkaround is the only thing showing how it starts and idles. Leave those out
 * and the report is a set of assertions.
 *
 * `required` marks what a report should not be filed without. The rest is the
 * inspector going further.
 */
export const EVIDENCE_SLOTS: readonly {
  key: string;
  label: string;
  kind: 'photo' | 'video';
  required: boolean;
}[] = [
  { key: 'front', label: 'Exterior front', kind: 'photo', required: true },
  { key: 'rear', label: 'Rear and sides', kind: 'photo', required: true },
  { key: 'odometer', label: 'Odometer', kind: 'photo', required: true },
  { key: 'vin_plate', label: 'VIN plate', kind: 'photo', required: true },
  { key: 'engine_bay', label: 'Engine or motor bay', kind: 'photo', required: false },
  { key: 'interior', label: 'Interior', kind: 'photo', required: false },
  { key: 'undercarriage', label: 'Undercarriage', kind: 'photo', required: false },
  { key: 'defect', label: 'Any defect noted', kind: 'photo', required: false },
  { key: 'walkaround', label: 'Walkaround video', kind: 'video', required: true },
];

/**
 * Which required slots are still empty. Returns labels, so the message an
 * inspector sees names the shot rather than a key.
 */
export function missingEvidence(evidence: InspectionEvidence[] = []): string[] {
  const have = new Set(evidence.filter((e) => e?.url).map((e) => e.label));
  return EVIDENCE_SLOTS.filter((s) => s.required && !have.has(s.label)).map(
    (s) => s.label,
  );
}

/**
 * A note carried by a section that still passed.
 *
 * Advisories are pulled out of the report on their own because of how they are
 * missed otherwise: a caveat written on a green row reads as reassurance at a
 * glance. The dealer decides whether to buy on the strength of this report, so
 * anything the inspector qualified a pass with is surfaced as its own list
 * rather than left to be found row by row.
 */
export interface InspectionAdvisory {
  key: string;
  label: string;
  note: string;
}

/** Blank, whitespace-only and absent notes are all "no note". */
export function normalizeSectionNote(note?: string | null): string | null {
  const trimmed = typeof note === 'string' ? note.trim() : '';
  return trimmed === '' ? null : trimmed;
}

/** Every passed section the inspector qualified, in the order they were filed. */
export function collectAdvisories(
  report?: InspectionReport | null,
): InspectionAdvisory[] {
  if (!report?.sections?.length) return [];
  return report.sections.flatMap((section) => {
    if (section.state !== 'pass') return [];
    const note = normalizeSectionNote(section.note);
    return note ? [{ key: section.key, label: section.label, note }] : [];
  });
}

/**
 * The inspector's findings. Written once, by the back office, and read by the
 * buyer's report screen. `outcome` is the only field with lifecycle meaning:
 * it decides whether the inspection lands at PASSED or FAILED.
 *
 * A pass is not a silent all-clear: sections may carry notes the buyer has to
 * read before deciding. See `collectAdvisories`.
 */
export interface InspectionReport {
  outcome: 'pass' | 'fail';
  /** Overall condition grade, e.g. "A-". Free text: graders differ by market. */
  grade: string;
  /**
   * The one-line verdict, printed large above the detail: "Clean, well-
   * maintained example. Passes for sale." A dealer who reads nothing else
   * reads this, so it is captured separately rather than hoping the summary
   * opens with something quotable.
   */
  headline?: string | null;
  summary: string;
  /** Confirmed against the car in the yard, not against the listing. */
  vinVerified: boolean;
  odometerVerified: boolean;
  mileageKm?: number | null;
  /** EVs only. Null on a combustion car rather than a misleading 100. */
  batteryHealthPct?: number | null;
  /** Charge cycles used. Context for the health figure: 94% at 312 cycles is
   *  a different car from 94% at 1,800. */
  batteryCycles?: number | null;
  /** Range actually achieved on test, in km, as against the claimed figure. */
  rangeTestKm?: number | null;

  /** What the records say. See InspectionHistory. */
  history?: InspectionHistory | null;
  sections: InspectionSection[];
  /**
   * Labelled photo and video evidence. `photos` below stays as the plain URL
   * list so nothing that already reads it breaks; this is the richer form the
   * report sheet renders.
   */
  evidence?: InspectionEvidence[];
  photos: string[];
  inspectorName: string;
  /** The inspector's code on the report sheet, e.g. "CN-INS-14". */
  inspectorCode?: string | null;
  /** Where the inspection happened, for the sheet's signature line. */
  inspectedAt?: string | null;
  inspectorId?: string | null;
  submittedAt: Date;
}

export class Inspection extends BaseDomain {
  /** Human-readable, shown to all three parties. See buildInspectionRef. */
  reference: string;

  listingId: string;
  supplierId: string;
  /** The dealer who paid. Auth is mandatory, so this is never anonymous. */
  buyerId: string;

  status: InspectionStatus;

  /** What was charged, in the same currency the listing quotes. */
  fee: number;
  currency: string;
  paidAt: Date;
  /** Set once a real gateway is wired in; null while payment is simulated. */
  paymentReference?: string | null;

  /** The car is held for this buyer until here. */
  reservedUntil: Date;

  // Supplier's answer to "can our inspector come to your yard?"
  respondedAt?: Date | null;
  supplierNote?: string | null;

  // Back office scheduling.
  inspectorId?: string | null;
  scheduledAt?: Date | null;

  report?: InspectionReport | null;
  cancelledAt?: Date | null;
}

/**
 * "SP-2026-0412". Year plus a short random tail: the parties quote this at each
 * other in chat, so it has to be short enough to read aloud and unique enough
 * not to collide across a day's orders.
 */
export function buildInspectionRef(now: Date, random: number): string {
  const tail = String(Math.floor(random * 10000)).padStart(4, '0');
  return `SP-${now.getUTCFullYear()}-${tail}`;
}

/** When paying today holds the car until. The window is operator-editable, so
    it is passed in; the constant remains the fallback. */
export function reservationDeadline(
  from: Date,
  hours: number = RESERVATION_HOURS,
): Date {
  const window = Number.isFinite(hours) && hours > 0 ? hours : RESERVATION_HOURS;
  return new Date(from.getTime() + window * 60 * 60 * 1000);
}
