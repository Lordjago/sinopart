/**
 * SupplierRepositoryImpl: the ADAPTER implementing SupplierRepository.
 * Bound to SUPPLIER_REPOSITORY in database.module; maps documents ⇄ the Supplier
 * entity via SupplierMapper so use cases never touch Mongoose.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { SupplierMapper } from '../../../../application/mappers/supplier.mapper';
import type {
  Supplier,
  SupplierOfficeAddress,
} from '../../../../core/domain/entities/supplier';
import { SupplierAccountStatus } from '../../../../core/domain/entities/supplier';
import type {
  BankAccountInput,
  KycDocument,
} from '../../../../core/domain/value-object/kyc';
import { Page } from '../../../../core/domain/value-object/page';
import type {
  KycReviewInput,
  SupplierFilters,
  SupplierRepository,
} from '../../../../core/interfaces/repository/supplier.repository';
import { SupplierDocument } from '../documents/supplier.document';
import { FieldCipher } from '../../../services/crypto/field-cipher';
import { contains } from '../query.util';

@Injectable()
export class SupplierRepositoryImpl implements SupplierRepository {
  constructor(
    @InjectModel('suppliers') private readonly model: Model<SupplierDocument>,
    private readonly cipher: FieldCipher,
  ) {}

  async create(supplier: Supplier): Promise<Supplier> {
    const created = await this.model.create(
      SupplierMapper.toPersistence(supplier),
    );
    return SupplierMapper.toDomain(created)!;
  }

  async findByPhone(phone: string): Promise<Supplier | null> {
    const doc = await this.model.findOne({ phone }).exec();
    return SupplierMapper.toDomain(doc);
  }

  async findById(id: string): Promise<Supplier | null> {
    const doc = await this.model.findById(id).exec();
    return SupplierMapper.toDomain(doc);
  }

  async findByIds(ids: string[]): Promise<Supplier[]> {
    const valid = ids.filter((id) => this.isValidId(id));
    if (!valid.length) return [];
    const docs = await this.model.find({ _id: { $in: valid } }).exec();
    return docs.map((d) => SupplierMapper.toDomain(d)!);
  }

  async findAll(filters: SupplierFilters): Promise<Page<Supplier>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    const query: FilterQuery<SupplierDocument> = {};
    if (filters.status) query.accountStatus = filters.status;
    // `$ne: []` rather than a size check: the review queue wants every store
    // that has sent anything at all, whatever stage it reached.
    if (filters.withKycOnly) query.kycDocuments = { $ne: [] };
    if (filters.search) {
      const term = contains(filters.search);
      query.$or = [{ storeName: term }, { legalName: term }, { phone: term }];
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        // Stores that submitted most recently first; never-submitted stores
        // sort last, which is where the queue wants them.
        .sort({ kycSubmittedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return new Page(
      docs.map((d) => SupplierMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$accountStatus', count: { $sum: 1 } } },
      ])
      .exec();
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  }

  async reviewKycDocument(input: KycReviewInput): Promise<Supplier | null> {
    if (!this.isValidId(input.supplierId)) return null;
    // The positional operator writes the ONE matched array element, so a
    // second reviewer deciding a different document at the same moment cannot
    // clobber this decision the way saving the whole supplier would.
    const updated = await this.model
      .findOneAndUpdate(
        { _id: input.supplierId, 'kycDocuments.type': input.type },
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
    return SupplierMapper.toDomain(updated);
  }

  async update(supplier: Supplier): Promise<Supplier> {
    const updated = await this.model
      .findByIdAndUpdate(
        supplier._id,
        { $set: SupplierMapper.toPersistence(supplier) },
        { new: true },
      )
      .exec();
    return SupplierMapper.toDomain(updated)!;
  }

  async setAccountStatus(
    supplierId: string,
    status: SupplierAccountStatus,
  ): Promise<void> {
    await this.model
      .updateOne({ _id: supplierId }, { $set: { accountStatus: status } })
      .exec();
  }

  async acceptTerms(supplierId: string, at: Date): Promise<void> {
    await this.model
      .updateOne({ _id: supplierId }, { $set: { termsAcceptedAt: at } })
      .exec();
  }

  async upsertKycDocument(
    supplierId: string,
    doc: KycDocument,
  ): Promise<Supplier> {
    // Replace-by-type = pull any existing doc of this type, then push the new
    // one. Two steps because Mongo rejects $pull and $push on the same array in
    // one update. Per-type, so concurrent uploads of different types don't clash.
    await this.model
      .updateOne(
        { _id: supplierId },
        { $pull: { kycDocuments: { type: doc.type } } },
      )
      .exec();
    const updated = await this.model
      .findByIdAndUpdate(
        supplierId,
        { $push: { kycDocuments: doc } },
        { new: true },
      )
      .exec();
    return SupplierMapper.toDomain(updated)!;
  }

  async submitForReview(
    supplierId: string,
    bank: BankAccountInput,
    officeAddress: SupplierOfficeAddress,
    at: Date,
  ): Promise<Supplier> {
    const digits = bank.accountNumber.replace(/\D/g, '');
    const updated = await this.model
      .findByIdAndUpdate(
        supplierId,
        {
          $set: {
            bankAccount: {
              holder: bank.holder,
              bankName: bank.bankName,
              // Encrypted at rest; last4 kept plain purely for display.
              accountNumberEnc: this.cipher.encrypt(bank.accountNumber),
              last4: digits.slice(-4),
            },
            officeAddress: {
              street: officeAddress.street,
              city: officeAddress.city,
              province: officeAddress.province,
              postalCode: officeAddress.postalCode ?? null,
              country: officeAddress.country,
            },
            // The store's province has been '' since sign-up ("completed later
            // during KYC"). This is later: the address the store just gave us
            // is the only authority on it, so the facet is filled from there
            // rather than left for someone to type a second time.
            province: officeAddress.province,
            accountStatus: SupplierAccountStatus.REVIEW,
            kycSubmittedAt: at,
            termsAcceptedAt: at,
          },
        },
        { new: true },
      )
      .exec();
    return SupplierMapper.toDomain(updated)!;
  }

  /** An unparseable id matches nothing rather than throwing a CastError. */
  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }
}
