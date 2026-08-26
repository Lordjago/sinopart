import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ListingStatus } from '../../../../core/domain/entities/listing';

export type ListingDocument = HydratedDocument<ListingDoc>;

@Schema({ collection: 'listings', timestamps: true })
export class ListingDoc {
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

  // Which car this is: a pointer into the catalog, plus its parents copied
  // for one-query filtering (see the Listing entity for why that is safe).
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'vehicles',
    default: null,
    index: true,
  })
  vehicleId?: Types.ObjectId | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'series',
    default: null,
    index: true,
  })
  seriesId?: Types.ObjectId | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'brands',
    default: null,
    index: true,
  })
  brandId?: Types.ObjectId | null;

  /**
   * Set only while `vehicleId` is null: the car the supplier typed because the
   * catalog does not carry it yet. `_id: false` because it is a value on the
   * listing, not a document anyone looks up on its own.
   */
  @Prop({
    type: {
      brand: { type: String, trim: true },
      brandId: { type: SchemaTypes.ObjectId, ref: 'brands', default: null },
      series: { type: String, trim: true },
      seriesId: { type: SchemaTypes.ObjectId, ref: 'series', default: null },
      year: { type: Number },
      variant: { type: Number },
      fuelType: { type: String, trim: true },
      transmission: { type: String, trim: true },
      note: { type: String, trim: true, default: null },
      _id: false,
    },
    default: null,
  })
  proposedVehicle?: Record<string, unknown> | null;

  @Prop({ type: String, default: null, trim: true, uppercase: true })
  vin?: string | null;

  @Prop({ type: String, default: null, trim: true })
  body?: string | null;

  @Prop({ type: String, default: null, trim: true })
  exteriorColor?: string | null;

  @Prop({ type: String, default: null, trim: true })
  interiorColor?: string | null;

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

  /** Walkaround clips, stored URLs. Optional, unlike photos. */
  @Prop({ type: [String], default: [] })
  videos: string[];

  @Prop({ type: Number, default: null })
  fobPrice?: number | null;

  @Prop({ type: String, default: null, trim: true })
  province?: string | null;

  // Review trail: written by the submit / publish / return transitions.
  @Prop({ type: Date, default: null })
  submittedAt?: Date | null;

  @Prop({ type: Date, default: null })
  publishedAt?: Date | null;

  @Prop({ type: String, default: null, trim: true })
  reviewNote?: string | null;
}

export const ListingSchema = SchemaFactory.createForClass(ListingDoc);
