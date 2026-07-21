/**
 * Otp document (Mongoose schema) — persistence model for an OTP attempt
 * ---------------------------------------------------------------------------
 * Two indexes matter here:
 *   - `codeToken` is unique + indexed: it is the lookup key on every verify/reset.
 *   - `expiresAt` carries `expires: 0`, a MongoDB TTL index. Mongo automatically
 *     DELETES the document once that timestamp passes, so expired codes clean
 *     themselves up and the collection never grows unbounded.
 *
 * Note we store `codeHash`, never the 6 digits themselves.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OtpPurpose } from '../../../../core/domain/entities/otp';

export type OtpDocument = HydratedDocument<OtpDoc>;

@Schema({ collection: 'otps', timestamps: true })
export class OtpDoc {
  @Prop({ required: true, unique: true, index: true })
  codeToken: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: String, enum: OtpPurpose, required: true })
  purpose: OtpPurpose;

  @Prop({ required: true })
  codeHash: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Date, default: null })
  consumedAt?: Date | null;

  // TTL index: Mongo removes the document when `expiresAt` is reached.
  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(OtpDoc);
