import { BaseDomain } from './base.domain';

/**
 * One operator-editable value.
 *
 * The platform is full of numbers that are business decisions rather than
 * engineering ones: what an inspection costs, how long a reservation holds, the
 * FX rate a landed price is quoted at. Every one of them started life as a
 * constant in the source, which means changing it needs a developer, a deploy,
 * and a moment where the running system disagrees with what was agreed.
 *
 * These are those numbers, stored once and read at the point of use.
 *
 * Values are persisted as STRINGS and coerced on read against the definition's
 * declared type. One column, no polymorphic union to unpick, and the registry
 * below stays the single description of what each key means.
 */
export class Setting extends BaseDomain {
  key: string;
  /** Always a string on the wire and in the database. See `coerce`. */
  value: string;
  /** Which admin last changed it, for the audit line the panel shows. */
  updatedBy?: string | null;
}

export type SettingType = 'number' | 'rate' | 'string' | 'boolean';

/**
 * What a key means, what it may hold, and what it is worth when nobody has set
 * it. The defaults are the values that used to be hard-coded, so a fresh
 * database behaves exactly as the old constants did.
 */
export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  /** Groups the panel renders as sections. */
  group: 'Inspections' | 'Pricing' | 'Orders';
  defaultValue: string;
  /** Numbers and rates only. */
  min?: number;
  max?: number;
  /** Shown beside the input: "₦", "%", "hours". */
  unit?: string;
  /**
   * Whether an unauthenticated dealer app may read it. The fee must be
   * quotable before login; an internal margin must not.
   */
  public: boolean;
}

export const SETTING_KEYS = {
  INSPECTION_FEE: 'inspection.fee_ngn',
  RESERVATION_HOURS: 'inspection.reservation_hours',
  CNY_TO_NGN: 'pricing.cny_to_ngn',
  FREIGHT_INSURANCE: 'pricing.freight_insurance_ngn',
  SINOPART_FEE_RATE: 'pricing.sinopart_fee_rate',
  DUTY_RATE: 'pricing.duty_rate',
  ESCROW_RELEASE_PCT: 'orders.escrow_release_pct',
} as const;

/**
 * The registry. Adding a configurable value means adding an entry here and
 * reading it where the constant used to be: the admin screen, validation and
 * defaults all follow from this list, so there is no second place to update.
 */
export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: SETTING_KEYS.INSPECTION_FEE,
    label: 'Inspection fee',
    description:
      'What a dealer pays to have one car inspected. Quoted on the car page and the checkout screen, and charged when they pay.',
    type: 'number',
    group: 'Inspections',
    defaultValue: '150000',
    min: 0,
    max: 100_000_000,
    unit: '₦',
    public: true,
  },
  {
    key: SETTING_KEYS.RESERVATION_HOURS,
    label: 'Reservation window',
    description:
      'How long paying for an inspection holds a car off the market. The countdown on the dealer’s tracking screen runs to this.',
    type: 'number',
    group: 'Inspections',
    defaultValue: '72',
    min: 1,
    max: 720,
    unit: 'hours',
    public: true,
  },
  {
    key: SETTING_KEYS.CNY_TO_NGN,
    label: 'RMB to naira rate',
    description:
      'Used to convert a supplier’s FOB price into the landed figure dealers see. A placeholder until a live FX feed replaces it.',
    type: 'number',
    group: 'Pricing',
    defaultValue: '215',
    min: 1,
    max: 100_000,
    unit: '₦ per ¥',
    public: false,
  },
  {
    key: SETTING_KEYS.FREIGHT_INSURANCE,
    label: 'Freight and insurance',
    description: 'Ocean freight plus marine insurance, per car.',
    type: 'number',
    group: 'Pricing',
    defaultValue: '1380000',
    min: 0,
    max: 100_000_000,
    unit: '₦',
    public: false,
  },
  {
    key: SETTING_KEYS.SINOPART_FEE_RATE,
    label: 'Sinopart fee',
    description: 'Our cut, as a share of the vehicle price.',
    type: 'rate',
    group: 'Pricing',
    defaultValue: '0.03',
    min: 0,
    max: 1,
    unit: '%',
    public: false,
  },
  {
    key: SETTING_KEYS.DUTY_RATE,
    label: 'Duty and clearance',
    description:
      'Import duty plus clearance, as a share of vehicle + freight. Paid by the dealer on arrival, at the real figure.',
    type: 'rate',
    group: 'Pricing',
    defaultValue: '0.2',
    min: 0,
    max: 1,
    unit: '%',
    public: false,
  },
  {
    key: SETTING_KEYS.ESCROW_RELEASE_PCT,
    label: "Escrow release on loading",
    description:
      "The share of a purchase that reaches the store once loading is VIN-verified. The remainder is held back until the dealer confirms the car, which is what gives the VIN check its teeth.",
    type: "rate",
    group: "Orders",
    defaultValue: "0.85",
    min: 0,
    max: 1,
    unit: "%",
    public: false,
  },
];

export function findDefinition(key: string): SettingDefinition | undefined {
  return SETTING_DEFINITIONS.find((d) => d.key === key);
}

/** A stored string as the type its definition declares. */
export function coerce(
  definition: SettingDefinition,
  raw: string,
): number | string | boolean {
  switch (definition.type) {
    case 'number':
    case 'rate':
      return Number(raw);
    case 'boolean':
      return raw === 'true';
    default:
      return raw;
  }
}

/**
 * Whether a proposed value is allowed, as a message or null.
 *
 * Returned rather than thrown so the caller decides the error type, and so the
 * admin panel can show the same rule beside the input.
 */
export function validate(
  definition: SettingDefinition,
  raw: string,
): string | null {
  if (definition.type === 'number' || definition.type === 'rate') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return `${definition.label} must be a number.`;
    if (definition.min != null && n < definition.min) {
      return `${definition.label} cannot be below ${definition.min}.`;
    }
    if (definition.max != null && n > definition.max) {
      return `${definition.label} cannot be above ${definition.max}.`;
    }
  }
  if (definition.type === 'boolean' && raw !== 'true' && raw !== 'false') {
    return `${definition.label} must be true or false.`;
  }
  return null;
}
