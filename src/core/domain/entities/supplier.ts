import { BaseDomain } from './base.domain';
import type { BankAccountView, KycDocument } from '../value-object/kyc';

export enum SupplierAccountStatus {
  REGISTERED = 'registered',
  REVIEW = 'review',
  ACTION = 'action',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
}

export enum SupplierTier {
  NEW = 'new',
  STRONG = 'strong',
  TOP = 'top',
}

/**
 * Where the store actually trades from, collected on the KYC submit step.
 *
 * Free text rather than a normalised place: a Chinese office address does not
 * decompose into a lookup table, and the consumer that matters is a reviewer
 * reading it against the uploaded business licence. `province` is the one part
 * that is also a facet elsewhere (listing filters, the public store card), so
 * submitting an address mirrors it onto `Supplier.province` rather than leaving
 * two sources of truth for the same fact.
 */
export interface SupplierOfficeAddress {
  /** Street, building and unit, as one line. */
  street: string;
  city: string;
  province: string;
  /** Optional: not every address a store gives us carries one. */
  postalCode?: string | null;
  country: string;
}

export class Supplier extends BaseDomain {
  phone: string;
  storeName: string;
  legalName?: string;
  province: string;
  contactEmail?: string;
  tier: SupplierTier;
  accountStatus: SupplierAccountStatus;
  invitedBy?: string | null;
  termsAcceptedAt?: Date | null;
  /** Registered office address. Null until the store submits for verification. */
  officeAddress?: SupplierOfficeAddress | null;
  /** KYC documents the store has uploaded. Empty until they start verification. */
  kycDocuments?: KycDocument[];
  /** Display-safe payout account (last4 only). Full number lives encrypted in storage. */
  bankAccount?: BankAccountView | null;
  /** When the store submitted for review (REGISTERED → REVIEW). */
  kycSubmittedAt?: Date | null;
}
