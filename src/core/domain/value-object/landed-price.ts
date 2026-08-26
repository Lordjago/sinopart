/**
 * Landed cost: one FOB price in RMB, broken into the naira figures a dealer pays.
 * ---------------------------------------------------------------------------
 * A listing stores a single number, `fobPrice`, the supplier's asking price in
 * RMB. Every buyer-facing screen quotes something quite different: one landed
 * naira total, split into "pay now, in China" and "pay on arrival, in Nigeria".
 * This is the bridge, and it lives in the domain because what a car costs a
 * dealer is a business rule, not a rendering detail.
 *
 * It used to live in the dealer app (services/pricing.js). Moving it here is
 * the point: the fee the checkout screen QUOTES and the fee the inspection
 * endpoint CHARGES were two separate constants in two separate codebases, free
 * to drift apart without anything failing. Now one place answers both.
 *
 * IMPORTANT: the rates below are PLACEHOLDERS, not quotes. They produce a
 * coherent breakdown against real listing data so the screens can be built.
 * Replace them with a live FX feed and real freight/duty tables before launch;
 * every caller keeps working, because they read the object this returns rather
 * than doing arithmetic of their own.
 */

/** RMB -> NGN. A live FX feed replaces this. */
export const CNY_TO_NGN = 215;

/** Ocean freight + marine insurance, per unit, in naira. */
export const FREIGHT_INSURANCE_NGN = 1_380_000;

/** Sinopart's cut, as a share of the vehicle price. */
export const SINOPART_FEE_RATE = 0.03;

/** Import duty + clearance, as a share of vehicle + freight. Paid on arrival. */
export const DUTY_RATE = 0.2;

/**
 * What it costs to have one car inspected, in naira.
 *
 * The single source of truth for the fee: the checkout screen quotes this and
 * StartInspectionUseCase charges it. A flat fee for now; when it varies by car
 * or market this becomes a function of the listing.
 */
export const INSPECTION_FEE_NGN = 150_000;

/** Naira are quoted to the nearest thousand; the pennies are noise here. */
const round = (n: number) => Math.round(n / 1000) * 1000;

export interface LandedPrice {
  vehicle: number;
  freight: number;
  fees: number;
  duty: number;
  /** Settled in China, before the car ships. */
  payNow: number;
  /** Settled in Nigeria, at the real figure, when it arrives. */
  payOnArrival: number;
  landed: number;
  /** False when the listing carries no price, so the UI can say so. */
  hasPrice: boolean;
}

/**
 * The rates the calculation runs on.
 *
 * Passed in rather than read from the constants above, because they are now
 * admin-editable (see SETTING_DEFINITIONS). The constants remain as the
 * fallback, so a caller with no settings to hand still gets the old behaviour
 * instead of NaN.
 */
export interface PricingRates {
  cnyToNgn: number;
  freightInsurance: number;
  feeRate: number;
  dutyRate: number;
}

export const DEFAULT_RATES: PricingRates = {
  cnyToNgn: CNY_TO_NGN,
  freightInsurance: FREIGHT_INSURANCE_NGN,
  feeRate: SINOPART_FEE_RATE,
  dutyRate: DUTY_RATE,
};

export function landedPrice(
  fobPriceCny?: number | null,
  rates: PricingRates = DEFAULT_RATES,
): LandedPrice {
  // A rate that arrives unset or unparseable falls back rather than poisoning
  // the whole breakdown with NaN.
  const rate = (value: number, fallback: number) =>
    Number.isFinite(value) ? value : fallback;

  const fob = Number(fobPriceCny) || 0;
  const vehicle = round(fob * rate(rates.cnyToNgn, CNY_TO_NGN));
  const freight = rate(rates.freightInsurance, FREIGHT_INSURANCE_NGN);
  const fees = round(vehicle * rate(rates.feeRate, SINOPART_FEE_RATE));
  const duty = round((vehicle + freight) * rate(rates.dutyRate, DUTY_RATE));

  const payNow = vehicle + freight + fees;
  const payOnArrival = duty;

  return {
    vehicle,
    freight,
    fees,
    duty,
    payNow,
    payOnArrival,
    landed: payNow + payOnArrival,
    hasPrice: fob > 0,
  };
}

/** "₦24,480,000". */
export const fmtNaira = (n: number): string =>
  `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
