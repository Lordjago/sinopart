import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WaitListDocument = HydratedDocument<WaitListDoc>;

@Schema({ collection: 'waitlist', timestamps: true })
export class WaitListDoc {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ trim: true })
  name?: string;

  @Prop({ trim: true })
  dealership?: string;

  @Prop({ trim: true })
  whatsAppNumber?: string;

  @Prop({ trim: true })
  city?: string;
}

export const WaitListSchema = SchemaFactory.createForClass(WaitListDoc);
