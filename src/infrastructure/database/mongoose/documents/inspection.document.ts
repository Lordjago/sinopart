import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { InspectionStatus } from '../../../../core/domain/entities/inspection';

export type InspectionDocument = HydratedDocument<InspectionDoc>;

@Schema({ collection: 'inspections', timestamps: true })
export class InspectionDoc {
  @Prop({ required: true, unique: true, trim: true })
  reference: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'listings', required: true, index: true })
  listingId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'suppliers', required: true, index: true })
  supplierId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'users', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: InspectionStatus,
    default: InspectionStatus.PAID,
    index: true,
  })
  status: InspectionStatus;

  @Prop({ type: Number, required: true })
  fee: number;

  @Prop({ type: String, default: 'NGN' })
  currency: string;

  @Prop({ type: Date, required: true })
  paidAt: Date;

  @Prop({ type: String, default: null })
  paymentReference?: string | null;

  @Prop({ type: Date, required: true })
  reservedUntil: Date;

  @Prop({ type: Date, default: null })
  respondedAt?: Date | null;

  @Prop({ type: String, default: null, trim: true })
  supplierNote?: string | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'users', default: null })
  inspectorId?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  scheduledAt?: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt?: Date | null;

  /**
   * The inspector's findings. `_id: false` on the section rows: they are values
   * within the report, never addressed on their own.
   */
  @Prop({
    type: {
      outcome: { type: String },
      grade: { type: String, trim: true },
      headline: { type: String, trim: true, default: null },
      summary: { type: String, trim: true },
      vinVerified: { type: Boolean, default: false },
      odometerVerified: { type: Boolean, default: false },
      mileageKm: { type: Number, default: null },
      batteryCycles: { type: Number, default: null },
      rangeTestKm: { type: Number, default: null },
      history: {
        type: {
          accidentRecords: { type: Number, default: null },
          insuranceClaims: { type: Number, default: null },
          claimNote: { type: String, trim: true, default: null },
          maintenanceRecords: { type: Number, default: null },
          odometerIntegrity: { type: Boolean, default: null },
          source: { type: String, trim: true, default: null },
          _id: false,
        },
        default: null,
      },
      evidence: [
        {
          url: { type: String },
          label: { type: String, trim: true },
          kind: { type: String },
          _id: false,
        },
      ],
      batteryHealthPct: { type: Number, default: null },
      sections: [
        {
          key: { type: String },
          label: { type: String },
          state: { type: String },
          note: { type: String, default: null },
          group: { type: String, default: null },
          _id: false,
        },
      ],
      photos: [{ type: String }],
      inspectorName: { type: String, trim: true },
      inspectorCode: { type: String, trim: true, default: null },
      inspectedAt: { type: String, trim: true, default: null },
      inspectorId: { type: SchemaTypes.ObjectId, ref: 'users', default: null },
      submittedAt: { type: Date },
      _id: false,
    },
    default: null,
  })
  report?: Record<string, unknown> | null;
}

export const InspectionSchema = SchemaFactory.createForClass(InspectionDoc);
