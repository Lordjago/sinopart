/**
 * Listing document (Mongoose schema) — persistence model for a supplier listing.
 * `supplierId` and `status` are indexed (every supplier-scoped and catalog query
 * filters on them); `status + fobPrice` and `make` support the dealer catalog.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ListingStatus } from '../../../../core/domain/entities/listing';

export type ListingDocument = HydratedDocument<ListingDoc>;

@Schema({ collection: 'listings', timestamps: true })
export class ListingDoc {
  // Stored as a STRING (the supplier's _id hex), matching how every other
  // cross-entity id in this codebase is stored and compared. Using
  // Types.ObjectId here would make Mongoose cast queries to ObjectId while the
  // written value stayed a string — a silent no-match on every lookup.
  @Prop({ required: true, index: true })
  supplierId: string;

  @Prop({
    type: String,
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
    index: true,
  })
  status: ListingStatus;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, default: null, trim: true, uppercase: true })
  vin?: string | null;

  @Prop({ type: String, default: null, trim: true, index: true })
  make?: string | null;

  @Prop({ type: String, default: null, trim: true })
  model?: string | null;

  @Prop({ type: Number, default: null })
  year?: number | null;

  @Prop({ type: String, default: null, trim: true })
  trim?: string | null;

  @Prop({ type: String, default: null, trim: true })
  body?: string | null;

  @Prop({ type: String, default: null, trim: true })
  exteriorColor?: string | null;

  @Prop({ type: String, default: null, trim: true })
  interiorColor?: string | null;

  @Prop({ type: String, default: null, trim: true })
  fuel?: string | null;

  @Prop({ type: String, default: null, trim: true })
  drivetrain?: string | null;

  @Prop({ type: Number, default: null })
  batteryKwh?: number | null;

  @Prop({ type: Number, default: null })
  rangeKm?: number | null;

  @Prop({ type: Number, default: null })
  mileageKm?: number | null;

  @Prop({ type: String, default: null })
  firstRegistered?: string | null;

  @Prop({ type: Number, default: null })
  seats?: number | null;

  @Prop({ type: Number, default: null })
  doors?: number | null;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: Number, default: null })
  fobPrice?: number | null;

  @Prop({ type: String, default: null, trim: true })
  province?: string | null;
}

export const ListingSchema = SchemaFactory.createForClass(ListingDoc);
