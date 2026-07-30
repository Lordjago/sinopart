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
  /** KYC documents the store has uploaded. Empty until they start verification. */
  kycDocuments?: KycDocument[];
  /** Display-safe payout account (last4 only). Full number lives encrypted in storage. */
  bankAccount?: BankAccountView | null;
  /** When the store submitted for review (REGISTERED → REVIEW). */
  kycSubmittedAt?: Date | null;
}
