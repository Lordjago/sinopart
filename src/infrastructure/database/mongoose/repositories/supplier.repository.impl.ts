/**
 * SupplierRepositoryImpl — the ADAPTER implementing SupplierRepository.
 * Bound to SUPPLIER_REPOSITORY in database.module; maps documents ⇄ the Supplier
 * entity via SupplierMapper so use cases never touch Mongoose.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupplierMapper } from '../../../../application/mappers/supplier.mapper';
import type { Supplier } from '../../../../core/domain/entities/supplier';
import { SupplierAccountStatus } from '../../../../core/domain/entities/supplier';
import type {
  BankAccountInput,
  KycDocument,
} from '../../../../core/domain/value-object/kyc';
import type { SupplierRepository } from '../../../../core/interfaces/repository/supplier.repository';
import { SupplierDocument } from '../documents/supplier.document';
import { FieldCipher } from '../../../services/crypto/field-cipher';

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
}
