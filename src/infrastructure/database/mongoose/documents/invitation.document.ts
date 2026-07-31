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
