/**
 * ListingRepositoryImpl — the ADAPTER for the ListingRepository port.
 * Bound to LISTING_REPOSITORY in database.module. All Mongo vocabulary stops
 * here; `findPublic` hard-codes status = available so the dealer catalog can
 * never leak a non-live listing.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ListingMapper } from '../../../../application/mappers/listing.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import {
  ListingStatus,
  type Listing,
} from '../../../../core/domain/entities/listing';
import type {
  ListingRepository,
  PublicListingFilters,
} from '../../../../core/interfaces/repository/listing.repository';
import { ListingDocument } from '../documents/listing.document';
import { contains } from '../query.util';

@Injectable()
export class ListingRepositoryImpl implements ListingRepository {
  constructor(
    @InjectModel('listings') private readonly model: Model<ListingDocument>,
  ) {}

  async create(listing: Listing): Promise<Listing> {
    const created = await this.model.create(
      ListingMapper.toPersistence(listing),
    );
    return ListingMapper.toDomain(created)!;
  }

  async findById(id: string): Promise<Listing | null> {
    if (!this.isValidId(id)) return null;
    const doc = await this.model.findById(id).exec();
    return ListingMapper.toDomain(doc);
  }

  async findBySupplier(supplierId: string): Promise<Listing[]> {
    const docs = await this.model
      .find({ supplierId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => ListingMapper.toDomain(d)!);
  }

  async findPublic(filters: PublicListingFilters): Promise<Page<Listing>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    // Non-negotiable: the public catalog is available-only.
    const query: FilterQuery<ListingDocument> = {
      status: ListingStatus.AVAILABLE,
    };
    if (filters.make) query.make = contains(filters.make);
    if (filters.fuel) query.fuel = filters.fuel;
    if (filters.body) query.body = filters.body;
    if (filters.province) query.province = filters.province;
    if (filters.minPrice != null || filters.maxPrice != null) {
      const range: Record<string, number> = {};
      if (filters.minPrice != null) range.$gte = filters.minPrice;
      if (filters.maxPrice != null) range.$lte = filters.maxPrice;
      query.fobPrice = range;
    }

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
      docs.map((d) => ListingMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async update(id: string, patch: Partial<Listing>): Promise<Listing> {
    const updated = await this.model
      .findByIdAndUpdate(
        id,
        { $set: ListingMapper.toUpdate(patch) },
        { new: true },
      )
      .exec();
    return ListingMapper.toDomain(updated)!;
  }

  async setStatus(id: string, status: ListingStatus): Promise<Listing> {
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .exec();
    return ListingMapper.toDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }

  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }
}
