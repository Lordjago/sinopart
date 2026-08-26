/**
 * DealerKycRepositoryImpl: the ADAPTER implementing DealerKycRepository.
 * Bound to DEALER_KYC_REPOSITORY in database.module; maps documents ⇄ the
 * DealerKyc entity via DealerKycMapper so use cases never touch Mongoose.
 *
 * This adapter owns the encryption of the two sensitive numbers. The core hands
 * over plaintext, the collection only ever holds ciphertext plus a `last4`, and
 * nothing decrypts on a read path — a BVN and a bank account number are written
 * once and shown as "••• 4821" thereafter.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { DealerKycMapper } from '../../../../application/mappers/dealer-kyc.mapper';
import type { DealerKyc } from '../../../../core/domain/entities/dealer-kyc';
import { DealerKycStatus } from '../../../../core/domain/entities/dealer-kyc';
import type {
  BankAccountInput,
  KycDocument,
} from '../../../../core/domain/value-object/kyc';
import { Page } from '../../../../core/domain/value-object/page';
import type {
  DealerKycDetailsInput,
  DealerKycFilters,
  DealerKycRepository,
  DealerKycReviewInput,
} from '../../../../core/interfaces/repository/dealer-kyc.repository';
import { DealerKycDocument } from '../documents/dealer-kyc.document';
import { FieldCipher } from '../../../services/crypto/field-cipher';
import { contains } from '../query.util';

@Injectable()
export class DealerKycRepositoryImpl implements DealerKycRepository {
  constructor(
    @InjectModel('dealerkycs') private readonly model: Model<DealerKycDocument>,
    private readonly cipher: FieldCipher,
  ) {}

  async findByUserId(userId: string): Promise<DealerKyc | null> {
    const doc = await this.model.findOne({ userId }).exec();
    return DealerKycMapper.toDomain(doc);
  }

  async ensureForUser(userId: string): Promise<DealerKyc> {
    // Upsert rather than find-then-create: two wizard steps saved at once
    // would otherwise race and trip the unique index on userId.
    const doc = await this.model
      .findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, status: DealerKycStatus.DRAFT } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    return DealerKycMapper.toDomain(doc)!;
  }

  async findByUserIds(userIds: string[]): Promise<DealerKyc[]> {
    if (!userIds.length) return [];
    const docs = await this.model.find({ userId: { $in: userIds } }).exec();
    return docs.map((d) => DealerKycMapper.toDomain(d)!);
  }

  async findAll(filters: DealerKycFilters): Promise<Page<DealerKyc>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    const query: FilterQuery<DealerKycDocument> = {};
    if (filters.status) query.status = filters.status;
    // The queue wants files that have actually been sent; a half-finished
    // draft is not a submission and has nothing for a reviewer to act on.
    if (filters.submittedOnly) query.submittedAt = { $ne: null };
    if (filters.search) {
      const term = contains(filters.search);
      query.$or = [{ businessName: term }, { rcNumber: term }];
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        // Most recently submitted first; never-submitted files sort last,
        // which is where a review queue wants them.
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return new Page(
      docs.map((d) => DealerKycMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
  }

  async saveDetails(
    userId: string,
    details: DealerKycDetailsInput,
  ): Promise<DealerKyc> {
    await this.ensureForUser(userId);

    // Only the keys the caller actually sent are written, so saving step 4
    // cannot blank out step 1. An absent key leaves the stored value alone.
    const $set: Record<string, unknown> = {};
    if (details.idType !== undefined) $set.idType = details.idType;
    if (details.idNumber !== undefined) {
      const digits = details.idNumber.replace(/\D/g, '');
      $set.idNumberEnc = this.cipher.encrypt(details.idNumber);
      $set.idLast4 = digits.slice(-4);
    }
    if (details.businessName !== undefined) {
      $set.businessName = details.businessName;
    }
    if (details.rcNumber !== undefined) $set.rcNumber = details.rcNumber;
    if (details.address !== undefined) $set.address = details.address;

    const updated = await this.model
      .findOneAndUpdate({ userId }, { $set }, { new: true })
      .exec();
    return DealerKycMapper.toDomain(updated)!;
  }

  async saveBankAccount(
    userId: string,
    bank: BankAccountInput,
  ): Promise<DealerKyc> {
    await this.ensureForUser(userId);
    const digits = bank.accountNumber.replace(/\D/g, '');
    const updated = await this.model
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            bankAccount: {
              holder: bank.holder,
              bankName: bank.bankName,
              accountNumberEnc: this.cipher.encrypt(bank.accountNumber),
              last4: digits.slice(-4),
            },
          },
        },
        { new: true },
      )
      .exec();
    return DealerKycMapper.toDomain(updated)!;
  }

  async upsertKycDocument(
    userId: string,
    doc: KycDocument,
  ): Promise<DealerKyc> {
    await this.ensureForUser(userId);
    // Replace-by-type: pull any existing document of this type, then push the
    // new one. Two steps because Mongo rejects $pull and $push on the same
    // array in one update. Per-type, so concurrent uploads don't clash.
    await this.model
      .updateOne({ userId }, { $pull: { kycDocuments: { type: doc.type } } })
      .exec();
    const updated = await this.model
      .findOneAndUpdate(
        { userId },
        { $push: { kycDocuments: doc } },
        { new: true },
      )
      .exec();
    return DealerKycMapper.toDomain(updated)!;
  }

  async reviewKycDocument(
    input: DealerKycReviewInput,
  ): Promise<DealerKyc | null> {
    // The positional operator writes the ONE matched element, so a second
    // reviewer deciding a different document at the same moment cannot clobber
    // this decision the way saving the whole record would.
    const updated = await this.model
      .findOneAndUpdate(
        { userId: input.userId, 'kycDocuments.type': input.type },
        {
          $set: {
            'kycDocuments.$.status': input.status,
            'kycDocuments.$.rejectionReason': input.reason ?? null,
            'kycDocuments.$.reviewedBy': input.reviewedBy,
            'kycDocuments.$.reviewedAt': input.at,
          },
        },
        { new: true },
      )
      .exec();
    return DealerKycMapper.toDomain(updated);
  }

  async submitForReview(userId: string, at: Date): Promise<DealerKyc> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            status: DealerKycStatus.REVIEW,
            submittedAt: at,
            termsAcceptedAt: at,
            // A resubmission is a fresh application: last round's blanket
            // refusal must not still be on screen while this one is pending.
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null,
          },
        },
        { new: true },
      )
      .exec();
    return DealerKycMapper.toDomain(updated)!;
  }

  async setStatus(
    userId: string,
    status: DealerKycStatus,
    decision?: { reviewedBy?: string; reason?: string | null; at?: Date },
  ): Promise<DealerKyc> {
    const $set: Record<string, unknown> = { status };
    if (decision) {
      $set.reviewedAt = decision.at ?? new Date();
      if (decision.reviewedBy !== undefined) {
        $set.reviewedBy = decision.reviewedBy;
      }
      if (decision.reason !== undefined) $set.rejectionReason = decision.reason;
    }
    const updated = await this.model
      .findOneAndUpdate({ userId }, { $set }, { new: true })
      .exec();
    return DealerKycMapper.toDomain(updated)!;
  }
}
