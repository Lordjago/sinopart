import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SavedListingDocument = HydratedDocument<SavedListingDoc>;

@Schema({ collection: 'saved_listings', timestamps: true })
export class SavedListingDoc {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'users', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'listings', required: true, index: true })
  listingId: Types.ObjectId;
}

export const SavedListingSchema = SchemaFactory.createForClass(SavedListingDoc);

/**
 * One row per dealer per car. The unique index is what makes saving idempotent:
 * the repository upserts against it, so a double-tap writes the same row twice
 * instead of creating a duplicate or throwing.
 */
SavedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });
