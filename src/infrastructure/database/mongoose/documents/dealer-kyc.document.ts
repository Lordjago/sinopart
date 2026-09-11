/**
 * DealerKyc document (Mongoose schema): persistence model for one dealer's
 * verification file.
 *
 * `userId` is unique: a dealer has exactly one file, which is re-used across
 * resubmissions rather than accumulating a row per attempt. The sensitive
 * numbers (BVN/NIN, bank account) are stored ENCRYPTED by the repository via
 * FieldCipher, with only `last4` kept in the clear for display, so a read of
 * this collection never yields either number.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  DealerIdType,
  DealerKycStatus,
  IdVerificationStatus,
} from '../../../../core/domain/entities/dealer-kyc';
import {
  KycDocumentStatus,
  KycDocumentType,
} from '../../../../core/domain/value-object/kyc';

export type DealerKycDocument = HydratedDocument<DealerKycDoc>;

/** One uploaded document, embedded. `_id: false` — identified by `type`. */
@Schema({ _id: false })
export class DealerKycDocumentSub {
  @Prop({ type: String, enum: KycDocumentType, required: true })
  type: KycDocumentType;

  @Prop({ required: true })
  url: string;

  @Prop({ type: String, default: null })
  filename?: string | null;

  @Prop({ type: String, default: null })
  mimeType?: string | null;

  @Prop({
    type: String,
    enum: KycDocumentStatus,
    default: KycDocumentStatus.PENDING,
  })
  status: KycDocumentStatus;

  @Prop({ type: String, default: null })
  rejectionReason?: string | null;

  @Prop({ type: String, default: null })
  reviewedBy?: string | null;

  @Prop({ type: Date, required: true })
  uploadedAt: Date;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;
}
const DealerKycDocumentSchema = SchemaFactory.createForClass(
  DealerKycDocumentSub,
);

/** Refund destination. Same encrypted-at-rest treatment as a supplier payout. */
@Schema({ _id: false })
export class DealerBankAccountSub {
  @Prop({ required: true, trim: true })
  holder: string;

  @Prop({ required: true, trim: true })
  bankName: string;

  @Prop({ required: true })
  accountNumberEnc: string;

  @Prop({ required: true })
  last4: string;
}
const DealerBankAccountSchema = SchemaFactory.createForClass(
  DealerBankAccountSub,
);

@Schema({ _id: false })
export class DealerAddressSub {
  @Prop({ default: '', trim: true })
  street: string;

  @Prop({ default: '', trim: true })
  city: string;

  @Prop({ default: '', trim: true })
  state: string;
}
const DealerAddressSchema = SchemaFactory.createForClass(DealerAddressSub);

/**
 * Registered business plus the CAC certificate that evidences it. The
 * certificate's URL is copied here at upload time so the file and the typed
 * details a reviewer compares it against travel together.
 */
@Schema({ _id: false })
export class DealerBusinessSub {
  @Prop({ type: String, default: null, trim: true })
  name?: string | null;

  @Prop({ type: String, default: null, trim: true })
  rcNumber?: string | null;

  @Prop({ type: String, default: null })
  certificateUrl?: string | null;

  @Prop({ type: String, default: null })
  certificateFilename?: string | null;

  @Prop({ type: Date, default: null })
  certificateUploadedAt?: Date | null;
}

const DealerBusinessSchema = SchemaFactory.createForClass(DealerBusinessSub);

@Schema({ collection: 'dealerkycs', timestamps: true })
export class DealerKycDoc {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: DealerKycStatus,
    default: DealerKycStatus.DRAFT,
  })
  status: DealerKycStatus;

  @Prop({ type: String, enum: DealerIdType, default: null })
  idType?: DealerIdType | null;

  // Encrypted; `idLast4` is what any read shows.
  @Prop({ type: String, default: null })
  idNumberEnc?: string | null;

  @Prop({ type: String, default: null })
  idLast4?: string | null;

  // Registry check. Defaults to UNVERIFIED so files written before Dojah
  // existed read as "never checked" rather than silently as "fine".
  @Prop({
    type: String,
    enum: IdVerificationStatus,
    default: IdVerificationStatus.UNVERIFIED,
  })
  idVerificationStatus?: IdVerificationStatus | null;

  @Prop({ type: Date, default: null })
  idVerifiedAt?: Date | null;

  @Prop({ type: String, default: null })
  idVerificationRef?: string | null;

  @Prop({ type: DealerBusinessSchema, default: null })
  business?: DealerBusinessSub | null;

  // Kept alongside `business` so the admin free-text search ($or over these two
  // columns) keeps working, and so rows written before `business` existed still
  // read. The mapper composes `business` from these when it is absent.
  @Prop({ type: String, default: null, trim: true })
  businessName?: string | null;

  @Prop({ type: String, default: null, trim: true })
  rcNumber?: string | null;

  @Prop({ type: DealerAddressSchema, default: null })
  address?: DealerAddressSub | null;

  @Prop({ type: [DealerKycDocumentSchema], default: [] })
  kycDocuments: DealerKycDocumentSub[];

  @Prop({ type: DealerBankAccountSchema, default: null })
  bankAccount?: DealerBankAccountSub | null;

  @Prop({ type: Date, default: null })
  termsAcceptedAt?: Date | null;

  @Prop({ type: Date, default: null })
  submittedAt?: Date | null;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  @Prop({ type: String, default: null })
  reviewedBy?: string | null;

  @Prop({ type: String, default: null })
  rejectionReason?: string | null;
}

export const DealerKycSchema = SchemaFactory.createForClass(DealerKycDoc);
