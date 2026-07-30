import type { Otp } from '../../core/domain/entities/otp';

export class OtpMapper {
  static toDomain(document: any): Otp | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      codeToken: raw.codeToken,
      channelAddress: raw.channelAddress,
      purpose: raw.purpose,
      codeHash: raw.codeHash,
      attempts: raw.attempts ?? 0,
      verified: raw.verified ?? false,
      inviteCode: raw.inviteCode ?? null,
      consumedAt: raw.consumedAt ?? null,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPersistence(otp: Partial<Otp>): Record<string, any> {
    return {
      codeToken: otp.codeToken,
      channelAddress: otp.channelAddress,
      purpose: otp.purpose,
      codeHash: otp.codeHash,
      attempts: otp.attempts ?? 0,
      verified: otp.verified ?? false,
      inviteCode: otp.inviteCode ?? null,
      consumedAt: otp.consumedAt ?? null,
      expiresAt: otp.expiresAt,
    };
  }

  /**
   * Mutable subset — codeToken/channelAddress/purpose/inviteCode are fixed at
   * creation.
   */
  static toUpdate(otp: Partial<Otp>): Record<string, any> {
    return {
      codeHash: otp.codeHash,
      attempts: otp.attempts,
      verified: otp.verified,
      consumedAt: otp.consumedAt ?? null,
      expiresAt: otp.expiresAt,
    };
  }
}
