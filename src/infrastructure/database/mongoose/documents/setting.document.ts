import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SettingDocument = HydratedDocument<SettingDoc>;

/**
 * One row per overridden key. A key that has never been changed has NO row and
 * resolves to the registry default, so a fresh database behaves exactly as the
 * old hard-coded constants did.
 */
@Schema({ collection: 'settings', timestamps: true })
export class SettingDoc {
  @Prop({ required: true, unique: true, trim: true, index: true })
  key: string;

  /** Stored as a string and coerced on read. See the Setting entity. */
  @Prop({ required: true, trim: true })
  value: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'users', default: null })
  updatedBy?: Types.ObjectId | null;
}

export const SettingSchema = SchemaFactory.createForClass(SettingDoc);
