/**
 * IdentityVerificationRepositoryImpl: the ADAPTER for the lookup audit log.
 * Bound to IDENTITY_VERIFICATION_REPOSITORY in database.module.
 *
 * Like the dealer KYC adapter, this owns encryption: the core hands over the
 * provider payload as a plain object, and the collection only ever holds
 * ciphertext. Nothing decrypts on a read path.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdentityVerificationMapper } from '../../../../application/mappers/identity-verification.mapper';
import type { IdentityVerification } from '../../../../core/domain/entities/identity-verification';
import type { IdentityVerificationRepository } from '../../../../core/interfaces/repository/identity-verification.repository';
import { IdentityVerificationDocument } from '../documents/identity-verification.document';
import { FieldCipher } from '../../../services/crypto/field-cipher';

/** A dealer's audit trail is short; this caps a runaway read. */
const DEFAULT_LIMIT = 20;

@Injectable()
export class IdentityVerificationRepositoryImpl implements IdentityVerificationRepository {
  constructor(
    @InjectModel('identity_verifications')
    private readonly model: Model<IdentityVerificationDocument>,
    private readonly cipher: FieldCipher,
  ) {}

  async record(attempt: IdentityVerification): Promise<IdentityVerification> {
    const created = await this.model.create({
      userId: attempt.userId,
      idType: attempt.idType,
      idLast4: attempt.idLast4,
      outcome: attempt.outcome,
      reason: attempt.reason ?? null,
      providerReference: attempt.providerReference ?? null,
      payloadEnc: attempt.payload
        ? this.cipher.encrypt(JSON.stringify(attempt.payload))
        : null,
      attemptedAt: attempt.attemptedAt,
    });
    return IdentityVerificationMapper.toDomain(created)!;
  }

  async findByUserId(
    userId: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<IdentityVerification[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ attemptedAt: -1 })
      .limit(limit)
      .exec();
    return docs.map((d) => IdentityVerificationMapper.toDomain(d)!);
  }

  async findLatestForUser(
    userId: string,
  ): Promise<IdentityVerification | null> {
    const doc = await this.model
      .findOne({ userId })
      .sort({ attemptedAt: -1 })
      .exec();
    return IdentityVerificationMapper.toDomain(doc);
  }
}
