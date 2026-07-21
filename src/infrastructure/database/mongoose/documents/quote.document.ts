import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QuoteDocument = HydratedDocument<QuoteDoc>;

@Schema({ collection: 'quotes', timestamps: true })
export class QuoteDoc {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true }) year: number;
  @Prop({ required: true, min: 0 }) budget: number;
  @Prop({ required: true, trim: true, index: true }) whatsAppNumber: string;
}

export const QuoteSchema = SchemaFactory.createForClass(QuoteDoc);

// Every listing sorts newest-first, and the spam guard scans a recent window.
QuoteSchema.index({ createdAt: -1 });
