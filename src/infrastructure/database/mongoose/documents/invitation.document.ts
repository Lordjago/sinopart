/**
 * Invitation document (Mongoose schema). `code` is unique + indexed (the lookup
 * key during sign-up). `expiresAt` is a plain field checked in the use case —
 * NOT a TTL index, so consumed/revoked invites survive for audit.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { InvitationStatus } from '../../../../core/domain/entities/invitation';

export type InvitationDocument = HydratedDocument<InvitationDoc>;

@Schema({ collection: 'invitations', timestamps: true })
export class InvitationDoc {
  @Prop({ required: true, unique: true, index: true, trim: true })
  code: string;

  @Prop({ type: String, default: null, trim: true })
  storeName?: string | null;

  @Prop({ required: true })
  issuedBy: string;

  @Prop({ type: String, default: null })
  consumedBySupplierId?: string | null;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({
    type: String,
    enum: InvitationStatus,
    default: InvitationStatus.ACTIVE,
  })
  status: InvitationStatus;
}

export const InvitationSchema = SchemaFactory.createForClass(InvitationDoc);
