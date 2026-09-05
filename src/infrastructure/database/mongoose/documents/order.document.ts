import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { OrderStatus } from '../../../../core/domain/entities/order';

export type OrderDocument = HydratedDocument<OrderDoc>;

@Schema({ collection: 'orders', timestamps: true })
export class OrderDoc {
  @Prop({ required: true, unique: true, trim: true })
  reference: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'listings',
    required: true,
    index: true,
  })
  listingId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'suppliers',
    required: true,
    index: true,
  })
  supplierId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'users',
    required: true,
    index: true,
  })
  buyerId: Types.ObjectId;

  /** Unique: one purchase per inspection, enforced by the index not just a check. */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'inspections',
    required: true,
    unique: true,
  })
  inspectionId: Types.ObjectId;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.SECURING,
    index: true,
  })
  status: OrderStatus;

  /** Snapshotted at purchase. Never recomputed from today's rates. */
  @Prop({
    type: {
      vehicle: Number,
      freight: Number,
      fees: Number,
      subtotal: Number,
      inspectionCredit: Number,
      dueNow: Number,
      dutyEstimate: Number,
      _id: false,
    },
    required: true,
  })
  money: Record<string, number>;

  @Prop({ type: String, default: 'NGN' })
  currency: string;

  @Prop({
    type: {
      releaseOnLoading: Number,
      holdback: Number,
      releasedAt: { type: Date, default: null },
      holdbackReleasedAt: { type: Date, default: null },
      _id: false,
    },
    required: true,
  })
  escrow: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  paidAt: Date;

  @Prop({ type: String, default: null })
  paymentReference?: string | null;

  @Prop({ type: Date, default: null }) preparedAt?: Date | null;
  @Prop({ type: Date, default: null }) loadedAt?: Date | null;
  @Prop({ type: Date, default: null }) vinVerifiedAt?: Date | null;
  @Prop({ type: Date, default: null }) arrivedAt?: Date | null;
  @Prop({ type: Date, default: null }) clearingStartedAt?: Date | null;
  @Prop({ type: Date, default: null }) clearedAt?: Date | null;
  @Prop({ type: Date, default: null }) deliveredAt?: Date | null;
  @Prop({ type: Date, default: null }) completedAt?: Date | null;
  @Prop({ type: Date, default: null }) cancelledAt?: Date | null;

  @Prop({ type: String, default: null, trim: true }) trackingNote?:
    string | null;
  @Prop({ type: String, default: null, trim: true }) trackingReference?:
    string | null;
  @Prop({ type: Date, default: null }) etaAt?: Date | null;

  /* The agent's real clearance bill. Loose-typed like `money` and `escrow`
     above, which follow the same pattern: the shape is owned by the domain
     entity, not restated here. */
  @Prop({ type: Object, default: null })
  clearance?: Record<string, unknown> | null;

  @Prop({ type: String, default: null, trim: true }) disputeReason?:
    string | null;
  @Prop({ type: String, default: null, trim: true }) disputeResolvedNote?:
    string | null;
}

export const OrderSchema = SchemaFactory.createForClass(OrderDoc);
