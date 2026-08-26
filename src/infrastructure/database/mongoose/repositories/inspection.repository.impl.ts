/**
 * InspectionRepositoryImpl: the ADAPTER for the InspectionRepository port.
 * Bound to INSPECTION_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, isValidObjectId } from 'mongoose';
import { InspectionMapper } from '../../../../application/mappers/inspection.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import {
  HOLDS_THE_CAR,
  type Inspection,
} from '../../../../core/domain/entities/inspection';
import type {
  InspectionFilters,
  InspectionRepository,
} from '../../../../core/interfaces/repository/inspection.repository';
import { InspectionDocument } from '../documents/inspection.document';
import { contains } from '../query.util';

@Injectable()
export class InspectionRepositoryImpl implements InspectionRepository {
  constructor(
    @InjectModel('inspections')
    private readonly model: Model<InspectionDocument>,
  ) {}

  async create(inspection: Inspection): Promise<Inspection> {
    const created = await this.model.create(
      InspectionMapper.toPersistence(inspection),
    );
    return InspectionMapper.toDomain(created)!;
  }

  async findById(id: string): Promise<Inspection | null> {
    if (!isValidObjectId(id)) return null;
    return InspectionMapper.toDomain(await this.model.findById(id).exec());
  }

  async findActiveForListing(listingId: string): Promise<Inspection | null> {
    if (!isValidObjectId(listingId)) return null;
    const doc = await this.model
      .findOne({ listingId, status: { $in: [...HOLDS_THE_CAR] } })
      .sort({ createdAt: -1 })
      .exec();
    return InspectionMapper.toDomain(doc);
  }

  async find(filters: InspectionFilters): Promise<Page<Inspection>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const query = this.toQuery(filters);

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return new Page(
      docs.map((d) => InspectionMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async findAllFor(filters: InspectionFilters): Promise<Inspection[]> {
    const docs = await this.model
      .find(this.toQuery(filters))
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => InspectionMapper.toDomain(d)!);
  }

  async update(id: string, patch: Partial<Inspection>): Promise<Inspection> {
    const updated = await this.model
      .findByIdAndUpdate(id, InspectionMapper.toUpdate(patch), { new: true })
      .exec();
    return InspectionMapper.toDomain(updated)!;
  }

  private toQuery(filters: InspectionFilters): FilterQuery<InspectionDocument> {
    const query: FilterQuery<InspectionDocument> = {};
    if (filters.status) query.status = filters.status;
    if (filters.buyerId) query.buyerId = filters.buyerId;
    if (filters.supplierId) query.supplierId = filters.supplierId;
    if (filters.listingId) query.listingId = filters.listingId;
    if (filters.search) query.reference = contains(filters.search);
    return query;
  }
}
