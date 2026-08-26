/**
 * SeriesRepositoryImpl: the ADAPTER for the SeriesRepository port.
 * Bound to SERIES_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { SeriesMapper } from '../../../../application/mappers/series.mapper';
import type { Series } from '../../../../core/domain/entities/series';
import type {
  SeriesFilters,
  SeriesRepository,
} from '../../../../core/interfaces/repository/series.repository';
import { SeriesDocument } from '../documents/series.document';
import { contains, equalsIgnoreCase } from '../query.util';

@Injectable()
export class SeriesRepositoryImpl implements SeriesRepository {
  constructor(
    @InjectModel('series') private readonly model: Model<SeriesDocument>,
  ) {}

  async create(series: Series): Promise<Series> {
    const created = await this.model.create(SeriesMapper.toPersistence(series));
    return SeriesMapper.toDomain(created)!;
  }

  async findById(id: string): Promise<Series | null> {
    if (!this.isValidId(id)) return null;
    const doc = await this.model.findById(id).exec();
    return SeriesMapper.toDomain(doc);
  }

  async findByName(brandId: string, name: string): Promise<Series | null> {
    if (!this.isValidId(brandId)) return null;
    const doc = await this.model
      .findOne({ brandId, name: equalsIgnoreCase(name) })
      .exec();
    return SeriesMapper.toDomain(doc);
  }

  async findAll(filters: SeriesFilters): Promise<Series[]> {
    const query: FilterQuery<SeriesDocument> = {};
    if (filters.brandId) {
      // An unparseable id matches nothing rather than throwing a CastError.
      if (!this.isValidId(filters.brandId)) return [];
      query.brandId = filters.brandId;
    }
    if (filters.search) query.name = contains(filters.search);
    const docs = await this.model.find(query).sort({ name: 1 }).exec();
    return docs.map((d) => SeriesMapper.toDomain(d)!);
  }

  async countByBrand(brandId: string): Promise<number> {
    if (!this.isValidId(brandId)) return 0;
    return this.model.countDocuments({ brandId }).exec();
  }

  async update(id: string, patch: Partial<Series>): Promise<Series> {
    const updated = await this.model
      .findByIdAndUpdate(
        id,
        { $set: SeriesMapper.toUpdate(patch) },
        { new: true },
      )
      .exec();
    return SeriesMapper.toDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }

  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }
}
