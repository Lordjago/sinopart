/**
 * `identity_verifications`: the append-only log of registry lookups.
 *
 * Note what this schema does NOT declare: the identity number. Only `idLast4`.
 * The provider payload is held as `payloadEnc`, a plain String that the
 * repository fills with ciphertext, matching how `idNumberEnc` works on the
 * dealer KYC file.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DealerIdType } from '../../../../core/domain/entities/dealer-kyc';
import { IdentityVerificationOutcome } from '../../../../core/domain/entities/identity-verification';

export type IdentityVerificationDocument =
  HydratedDocument<IdentityVerificationDoc>;

@Schema({ collection: 'identity_verifications', timestamps: true })
export class IdentityVerificationDoc {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: String, enum: DealerIdType, required: true })
  idType: DealerIdType;

  @Prop({ type: String, required: true })
  idLast4: string;

  @Prop({
    type: String,
    enum: IdentityVerificationOutcome,
    required: true,
  })
  outcome: IdentityVerificationOutcome;

  @Prop({ type: String, default: null })
  reason?: string | null;

  @Prop({ type: String, default: null })
  providerReference?: string | null;

  /** Encrypted provider payload. Never read on a normal path. */
  @Prop({ type: String, default: null })
  payloadEnc?: string | null;

  @Prop({ type: Date, required: true })
  attemptedAt: Date;
}

export const IdentityVerificationSchema = SchemaFactory.createForClass(
  IdentityVerificationDoc,
);

// The only query this collection serves: one dealer's attempts, newest first.
IdentityVerificationSchema.index({ userId: 1, attemptedAt: -1 });
