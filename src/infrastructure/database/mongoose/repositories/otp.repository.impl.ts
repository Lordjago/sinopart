/**
 * OtpRepositoryImpl — the ADAPTER implementing the OtpRepository port
 * ---------------------------------------------------------------------------
 * Bound to the OTP_REPOSITORY token in database.module. Uses OtpMapper to
 * translate documents ⇄ the `Otp` domain entity so use cases never touch
 * Mongoose.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OtpMapper } from '../../../../application/mappers/otp.mapper';
import type { Otp } from '../../../../core/domain/entities/otp';
import type { OtpRepository } from '../../../../core/interfaces/repository/otp.repository';
import { OtpDocument } from '../documents/otp.document';

@Injectable()
export class OtpRepositoryImpl implements OtpRepository {
  constructor(
    @InjectModel('otps') private readonly model: Model<OtpDocument>,
  ) {}

  async create(otp: Otp): Promise<Otp> {
    const created = await this.model.create(OtpMapper.toPersistence(otp));
    return OtpMapper.toDomain(created)!;
  }

  async findByCodeToken(codeToken: string): Promise<Otp | null> {
    const doc = await this.model.findOne({ codeToken }).exec();
    return OtpMapper.toDomain(doc);
  }

  async update(otp: Otp): Promise<Otp> {
    const updated = await this.model
      .findOneAndUpdate(
        { codeToken: otp.codeToken },
        { $set: OtpMapper.toUpdate(otp) },
        { new: true },
      )
      .exec();
    return OtpMapper.toDomain(updated)!;
  }
}
