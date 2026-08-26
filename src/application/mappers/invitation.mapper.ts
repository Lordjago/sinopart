import type { Invitation } from '../../core/domain/entities/invitation';
import { InvitationStatus } from '../../core/domain/entities/invitation';

export class InvitationMapper {
  static toDomain(document: any): Invitation | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      code: raw.code,
      storeName: raw.storeName ?? undefined,
      issuedBy: raw.issuedBy,
      consumedBySupplierId: raw.consumedBySupplierId ?? null,
      expiresAt: raw.expiresAt ?? null,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPersistence(invitation: Partial<Invitation>): Record<string, any> {
    return {
      code: invitation.code,
      storeName: invitation.storeName ?? null,
      issuedBy: invitation.issuedBy,
      consumedBySupplierId: invitation.consumedBySupplierId ?? null,
      expiresAt: invitation.expiresAt ?? null,
      status: invitation.status ?? InvitationStatus.ACTIVE,
    };
  }
}
