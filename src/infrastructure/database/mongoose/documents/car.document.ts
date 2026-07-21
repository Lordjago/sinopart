/**
 * Car document (Mongoose schema) — the PERSISTENCE model for a catalog listing
 * ---------------------------------------------------------------------------
 * The infrastructure twin of the `Car` domain entity. `slug` is indexed + unique
 * (it is the URL id); `make` and `status` are indexed so the catalog can filter
 * quickly. `CarHistoryItemDoc` is a nested sub-schema with `_id: false` so each
 * history badge does not get its own id.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CarStatus } from '../../../../core/domain/entities/car';

export type CarDocument = HydratedDocument<CarDoc>;

@Schema({ _id: false })
export class CarHistoryItemDoc {
  @Prop({ required: true })
  tone: string; // "ok" | "warn"

  @Prop({ required: true })
  text: string;
}
const CarHistoryItemSchema = SchemaFactory.createForClass(CarHistoryItemDoc);

@Schema({ collection: 'cars', timestamps: true })
export class CarDoc {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, index: true })
  make: string;

  @Prop({ required: true })
  fuel: string;

  @Prop({ required: true })
  km: string;

  @Prop({ required: true })
  firstReg: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  credit: string;

  @Prop({ type: [CarHistoryItemSchema], default: [] })
  history: CarHistoryItemDoc[];

  @Prop({ default: '' })
  source: string;

  @Prop({ required: true })
  price: string;

  @Prop({ default: '' })
  priceNote: string;

  @Prop({
    type: String,
    enum: CarStatus,
    default: CarStatus.AVAILABLE,
    index: true,
  })
  status: CarStatus;
}

export const CarSchema = SchemaFactory.createForClass(CarDoc);
