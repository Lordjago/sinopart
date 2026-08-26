/**
 * SettingRepositoryImpl: the ADAPTER for the SettingRepository port.
 * Bound to SETTING_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Setting } from '../../../../core/domain/entities/setting';
import type { SettingRepository } from '../../../../core/interfaces/repository/setting.repository';
import { SettingDocument } from '../documents/setting.document';
import { idOf } from '../../../../application/mappers/ref.util';

@Injectable()
export class SettingRepositoryImpl implements SettingRepository {
  constructor(
    @InjectModel('settings') private readonly model: Model<SettingDocument>,
  ) {}

  async findAll(): Promise<Setting[]> {
    const docs = await this.model.find().exec();
    return docs.map((d) => this.toDomain(d)!);
  }

  async findByKey(key: string): Promise<Setting | null> {
    return this.toDomain(await this.model.findOne({ key }).exec());
  }

  async put(
    key: string,
    value: string,
    updatedBy?: string | null,
  ): Promise<Setting> {
    const doc = await this.model
      .findOneAndUpdate(
        { key },
        { $set: { value, updatedBy: updatedBy ?? null } },
        { new: true, upsert: true },
      )
      .exec();
    return this.toDomain(doc)!;
  }

  private toDomain(doc: SettingDocument | null): Setting | null {
    if (!doc) return null;
    const raw = doc.toObject() as Record<string, any>;
    return {
      _id: raw._id?.toString(),
      key: raw.key,
      value: raw.value,
      updatedBy: idOf(raw.updatedBy) ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Setting;
  }
}
