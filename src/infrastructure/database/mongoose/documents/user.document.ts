/**
 * User document (Mongoose schema) — the PERSISTENCE model
 * ---------------------------------------------------------------------------
 * This is the infrastructure-layer twin of the `User` domain entity. Where the
 * entity is a pure class, the document carries the database concerns: Mongoose
 * decorators, the collection name, indexes, defaults, and `select: false` on the
 * password hash. The repository adapter maps between this document and the
 * entity so the core never sees these Mongoose types.
 *
 * `UserDocument` = a hydrated instance (with `_id`, `.save()`, timestamps).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole, UserTier } from '../../../../core/domain/entities/user';

export type UserDocument = HydratedDocument<UserDoc>;

@Schema({ collection: 'users', timestamps: true })
export class UserDoc {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  business: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '', trim: true })
  phone: string;

  // `select: false` hides the hash from reads by default; login opts back in
  // with `.select('+passwordHash')`, so it can never leak in a normal response.
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.BUYER })
  role: UserRole;

  @Prop({ type: String, enum: UserTier, default: UserTier.TIER_1 })
  tier: UserTier;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ default: false })
  emailVerified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(UserDoc);
