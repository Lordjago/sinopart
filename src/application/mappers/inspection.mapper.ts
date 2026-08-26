import type {
  Inspection,
  InspectionReport,
} from '../../core/domain/entities/inspection';
import {
  InspectionStatus,
  normalizeSectionNote,
} from '../../core/domain/entities/inspection';
import { idOf } from './ref.util';

export class InspectionMapper {
  static reportToDomain(raw: any): InspectionReport | null {
    if (!raw) return null;
    return {
      outcome: raw.outcome,
      grade: raw.grade,
      headline: raw.headline ?? null,
      summary: raw.summary,
      vinVerified: Boolean(raw.vinVerified),
      odometerVerified: Boolean(raw.odometerVerified),
      mileageKm: raw.mileageKm ?? null,
      batteryCycles: raw.batteryCycles ?? null,
      rangeTestKm: raw.rangeTestKm ?? null,
      history: raw.history
        ? {
            accidentRecords: raw.history.accidentRecords ?? null,
            insuranceClaims: raw.history.insuranceClaims ?? null,
            claimNote: raw.history.claimNote ?? null,
            maintenanceRecords: raw.history.maintenanceRecords ?? null,
            odometerIntegrity: raw.history.odometerIntegrity ?? null,
            source: raw.history.source ?? null,
          }
        : null,
      evidence: Array.isArray(raw.evidence)
        ? raw.evidence.map((e: any) => ({
            url: e.url,
            label: e.label,
            kind: e.kind,
          }))
        : [],
      batteryHealthPct: raw.batteryHealthPct ?? null,
      sections: Array.isArray(raw.sections)
        ? raw.sections.map((s: any) => ({
            key: s.key,
            label: s.label,
            state: s.state,
            note: normalizeSectionNote(s.note),
          }))
        : [],
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      inspectorName: raw.inspectorName,
      inspectorCode: raw.inspectorCode ?? null,
      inspectedAt: raw.inspectedAt ?? null,
      inspectorId: idOf(raw.inspectorId) ?? null,
      submittedAt: raw.submittedAt,
    };
  }

  static toDomain(document: any): Inspection | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      reference: raw.reference,
      listingId: idOf(raw.listingId)!,
      supplierId: idOf(raw.supplierId)!,
      buyerId: idOf(raw.buyerId)!,
      status: raw.status,
      fee: raw.fee,
      currency: raw.currency,
      paidAt: raw.paidAt,
      paymentReference: raw.paymentReference ?? null,
      reservedUntil: raw.reservedUntil,
      respondedAt: raw.respondedAt ?? null,
      supplierNote: raw.supplierNote ?? null,
      inspectorId: idOf(raw.inspectorId) ?? null,
      scheduledAt: raw.scheduledAt ?? null,
      cancelledAt: raw.cancelledAt ?? null,
      report: InspectionMapper.reportToDomain(raw.report),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Inspection;
  }

  static toPersistence(inspection: Partial<Inspection>): Record<string, any> {
    return {
      reference: inspection.reference,
      listingId: inspection.listingId,
      supplierId: inspection.supplierId,
      buyerId: inspection.buyerId,
      status: inspection.status ?? InspectionStatus.PAID,
      fee: inspection.fee,
      currency: inspection.currency ?? 'NGN',
      paidAt: inspection.paidAt,
      paymentReference: inspection.paymentReference ?? null,
      reservedUntil: inspection.reservedUntil,
      respondedAt: inspection.respondedAt ?? null,
      supplierNote: inspection.supplierNote ?? null,
      inspectorId: inspection.inspectorId ?? null,
      scheduledAt: inspection.scheduledAt ?? null,
      cancelledAt: inspection.cancelledAt ?? null,
      report: inspection.report ?? null,
    };
  }

  /** Only the keys present, so a status change never wipes the report. */
  static toUpdate(patch: Partial<Inspection>): Record<string, any> {
    const out: Record<string, any> = {};
    const fields: (keyof Inspection)[] = [
      'status',
      'respondedAt',
      'supplierNote',
      'inspectorId',
      'scheduledAt',
      'cancelledAt',
      'report',
      'paymentReference',
      'reservedUntil',
    ];
    for (const f of fields) {
      if (patch[f] !== undefined) out[f] = patch[f];
    }
    return out;
  }
}
