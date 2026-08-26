/**
 * Series document (Mongoose schema): the MIDDLE of the vehicle catalog tree
 * ---------------------------------------------------------------------------
 * A series (Camry) belongs to exactly one brand (Toyota) and owns many vehicles
 * (year / variant / fuel / transmission combinations). `brandId` is the owning
 * key; `vehicles` is a reverse virtual resolved with `.populate('vehicles')`.
 *
 * `name` is unique PER BRAND, not globally. Two brands may ship a series with
 * the same name, so uniqueness lives in the compound index below.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { VehicleDoc } from './vehicle.document';

export type SeriesDocument = HydratedDocument<SeriesDoc>;

@Schema({
  collection: 'series',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeriesDoc {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'brands',
    required: true,
    index: true,
  })
  brandId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  // Reverse virtual: not persisted.
  vehicles?: VehicleDoc[];
}

export const SeriesSchema = SchemaFactory.createForClass(SeriesDoc);

// One series name per brand.
SeriesSchema.index({ brandId: 1, name: 1 }, { unique: true });

SeriesSchema.virtual('vehicles', {
  ref: 'vehicles',
  localField: '_id',
  foreignField: 'seriesId',
});
