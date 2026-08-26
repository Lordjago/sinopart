/**
 * BrandRepositoryImpl: the ADAPTER for the BrandRepository port.
 * Bound to BRAND_REPOSITORY in database.module. All Mongo vocabulary stops
 * here; callers pass and receive plain `Brand` domain objects.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BrandMapper } from '../../../../application/mappers/brand.mapper';
import type { Brand } from '../../../../core/domain/entities/brand';
import type { BrandRepository } from '../../../../core/interfaces/repository/brand.repository';
import { BrandDocument } from '../documents/brand.document';
import { contains, equalsIgnoreCase } from '../query.util';

@Injectable()
export class BrandRepositoryImpl implements BrandRepository {
  constructor(
    @InjectModel('brands') private readonly model: Model<BrandDocument>,
  ) {}

  async create(brand: Brand): Promise<Brand> {
    const created = await this.model.create(BrandMapper.toPersistence(brand));
    return BrandMapper.toDomain(created)!;
  }

  async findById(id: string): Promise<Brand | null> {
    if (!this.isValidId(id)) return null;
    const doc = await this.model.findById(id).exec();
    return BrandMapper.toDomain(doc);
  }

  async findByName(name: string): Promise<Brand | null> {
    const doc = await this.model
      .findOne({ name: equalsIgnoreCase(name) })
      .exec();
    return BrandMapper.toDomain(doc);
  }

  async findAll(search?: string): Promise<Brand[]> {
    const query: FilterQuery<BrandDocument> = {};
    if (search) query.name = contains(search);
    const docs = await this.model.find(query).sort({ name: 1 }).exec();
    return docs.map((d) => BrandMapper.toDomain(d)!);
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    const updated = await this.model
      .findByIdAndUpdate(
        id,
        { $set: BrandMapper.toUpdate(patch) },
        { new: true },
      )
      .exec();
    return BrandMapper.toDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }

  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }
}
