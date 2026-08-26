/**
 * Brand document (Mongoose schema): the ROOT of the vehicle catalog tree
 * ---------------------------------------------------------------------------
 * Brand (Toyota) -> Series (Camry) -> Vehicle (2019 Camry 2.5 petrol auto).
 * A brand owns many series; the foreign key lives on `SeriesDoc.brandId`, and
 * `series` here is a reverse VIRTUAL. Nothing is stored on this document, it
 * is resolved on demand with `.populate('series')`.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SeriesDoc } from './series.document';

export type BrandDocument = HydratedDocument<BrandDoc>;

@Schema({
  collection: 'brands',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BrandDoc {
  @Prop({ required: true, unique: true, index: true, trim: true })
  name: string;

  @Prop({ type: String, default: null, trim: true })
  description?: string | null;

  @Prop({ type: String, default: null })
  logo?: string;

  // Reverse virtual: not persisted.
  series?: SeriesDoc[];
}

export const BrandSchema = SchemaFactory.createForClass(BrandDoc);

BrandSchema.virtual('series', {
  ref: 'series',
  localField: '_id',
  foreignField: 'brandId',
});
