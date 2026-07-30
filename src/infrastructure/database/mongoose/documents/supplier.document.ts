/**
 * Supplier document (Mongoose schema) — persistence model for a supplier.
 * `phone` is unique + indexed (it is the login identity). `province` defaults to
 * '' because it is completed later during KYC, not at phone-OTP sign-up.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  SupplierAccountStatus,
  SupplierTier,
} from '../../../../core/domain/entities/supplier';
import {
  KycDocumentStatus,
  KycDocumentType,
} from '../../../../core/domain/value-object/kyc';

export type SupplierDocument = HydratedDocument<SupplierDoc>;

/** One uploaded KYC document, embedded in the supplier. `_id: false` — these are
 *  identified by `type`, not their own id. */
@Schema({ _id: false })
export class KycDocumentSub {
  @Prop({ type: String, enum: KycDocumentType, required: true })
  type: KycDocumentType;

  @Prop({ required: true })
  url: string;

  @Prop({
    type: String,
    enum: KycDocumentStatus,
    default: KycDocumentStatus.PENDING,
  })
  status: KycDocumentStatus;

  @Prop({ type: String, default: null })
  rejectionReason?: string | null;

  @Prop({ type: Date, required: true })
  uploadedAt: Date;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;
}
const KycDocumentSchema = SchemaFactory.createForClass(KycDocumentSub);

/** Payout account. The account number is stored ENCRYPTED (`accountNumberEnc`,
 *  written by the repo via FieldCipher); `last4` is kept separately for display
 *  so we never decrypt just to show "•••• 3308". Plaintext is never persisted. */
@Schema({ _id: false })
export class BankAccountSub {
  @Prop({ required: true, trim: true })
  holder: string;

  @Prop({ required: true, trim: true })
  bankName: string;

  @Prop({ required: true })
  accountNumberEnc: string;

  @Prop({ required: true })
  last4: string;
}
const BankAccountSchema = SchemaFactory.createForClass(BankAccountSub);

@Schema({ collection: 'suppliers', timestamps: true })
export class SupplierDoc {
  @Prop({ required: true, unique: true, index: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  storeName: string;

  @Prop({ type: String, default: null, trim: true })
  legalName?: string | null;

  @Prop({ default: '', trim: true })
  province: string;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  contactEmail?: string | null;

  @Prop({ type: String, enum: SupplierTier, default: SupplierTier.NEW })
  tier: SupplierTier;

  @Prop({
    type: String,
    enum: SupplierAccountStatus,
    default: SupplierAccountStatus.REGISTERED,
  })
  accountStatus: SupplierAccountStatus;

  @Prop({ type: String, default: null })
  invitedBy?: string | null;

  @Prop({ type: Date, default: null })
  termsAcceptedAt?: Date | null;

  @Prop({ type: [KycDocumentSchema], default: [] })
  kycDocuments: KycDocumentSub[];

  @Prop({ type: BankAccountSchema, default: null })
  bankAccount?: BankAccountSub | null;

  @Prop({ type: Date, default: null })
  kycSubmittedAt?: Date | null;
}

export const SupplierSchema = SchemaFactory.createForClass(SupplierDoc);
