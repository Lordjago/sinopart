/**
 * Vehicle document (Mongoose schema): the LEAF of the vehicle catalog tree
 * ---------------------------------------------------------------------------
 * A vehicle is one concrete configuration of a series: model year, variant,
 * fuel type and transmission. It belongs to exactly one series and reaches its
 * brand through that series:
 *   `.populate({ path: 'seriesId', populate: { path: 'brandId' } })`
 *
 * The compound index below is the natural key, so the same configuration of a
 * series cannot be inserted twice.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type VehicleDocument = HydratedDocument<VehicleDoc>;

@Schema({ collection: 'vehicles', timestamps: true })
export class VehicleDoc {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'series',
    required: true,
    index: true,
  })
  seriesId: Types.ObjectId;

  @Prop({ type: Number, required: true, index: true })
  year: number;

  @Prop({ type: String, required: true, trim: true })
  fuelType: string;

  @Prop({ type: String, required: true, trim: true })
  transmission: string;

  @Prop({ type: Number, required: true })
  variant: number;
}

export const VehicleSchema = SchemaFactory.createForClass(VehicleDoc);

// One row per configuration of a series.
VehicleSchema.index(
  { seriesId: 1, year: 1, variant: 1, fuelType: 1, transmission: 1 },
  { unique: true },
);
