import type { IdentityVerification } from '../../core/domain/entities/identity-verification';

/**
 * Document ⇄ entity for one registry lookup.
 *
 * Note what does NOT come back: `payloadEnc`. It is read from the collection
 * and dropped here, exactly as `DealerKycMapper` drops `idNumberEnc`. The
 * entity is what flows out to views, so leaving the ciphertext behind at this
 * boundary is what stops a provider payload leaking because someone later adds
 * a field to a view.
 */
export class IdentityVerificationMapper {
  static toDomain(document: any): IdentityVerification | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      userId: raw.userId?.toString(),
      idType: raw.idType,
      idLast4: raw.idLast4,
      outcome: raw.outcome,
      reason: raw.reason ?? null,
      providerReference: raw.providerReference ?? null,
      // payloadEnc is deliberately not mapped.
      payload: null,
      attemptedAt: raw.attemptedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
