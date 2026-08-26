/**
 * ListingRepositoryImpl: the ADAPTER for the ListingRepository port.
 * Bound to LISTING_REPOSITORY in database.module. All Mongo vocabulary stops
 * here; `findPublic` restricts status to PUBLICLY_VISIBLE_STATUSES so the dealer
 * catalog can never leak a draft, a submission or a sold car.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ListingMapper } from '../../../../application/mappers/listing.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import {
  ListingStatus,
  PUBLICLY_VISIBLE_STATUSES,
  type Listing,
} from '../../../../core/domain/entities/listing';
import type {
  AdminListingFilters,
  ListingRepository,
  ListingReviewTrail,
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

    // Non-negotiable: the public catalog shows only what a dealer is allowed to
    // see. That is available AND reserved, never a draft, a submission or a
    // sold car. PUBLICLY_VISIBLE_STATUSES says why reserved is in that set.
    const query: FilterQuery<ListingDocument> = {
      status: { $in: [...PUBLICLY_VISIBLE_STATUSES] },
    };
    // An unparseable id matches nothing rather than throwing a CastError.
    if (filters.vehicleId) {
      if (!this.isValidId(filters.vehicleId))
        return new Page([], page, limit, 0);
      query.vehicleId = filters.vehicleId;
    }
    if (filters.seriesId) {
      if (!this.isValidId(filters.seriesId))
        return new Page([], page, limit, 0);
      query.seriesId = filters.seriesId;
    }
    if (filters.brandId) {
      if (!this.isValidId(filters.brandId)) return new Page([], page, limit, 0);
      query.brandId = filters.brandId;
    }
    if (filters.supplierId) {
      if (!this.isValidId(filters.supplierId))
        return new Page([], page, limit, 0);
      query.supplierId = filters.supplierId;
    }
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

  async findAll(filters: AdminListingFilters): Promise<Page<Listing>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    // No forced status here: unlike findPublic, the back-office list exists
    // precisely to show drafts and submissions.
    const query: FilterQuery<ListingDocument> = {};
    if (filters.status) query.status = filters.status;
    if (filters.supplierId) query.supplierId = filters.supplierId;
    if (filters.search) {
      const term = contains(filters.search);
      query.$or = [{ title: term }, { vin: term }];
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

  async countByStatus(supplierId?: string): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        // Scoped to one store when asked, platform-wide otherwise. `supplierId`
        // is indexed, so the match is served before the group rather than
        // scanning the collection to throw most of it away.
        ...(supplierId ? [{ $match: { supplierId } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
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

  async setStatus(
    id: string,
    status: ListingStatus,
    trail: ListingReviewTrail = {},
  ): Promise<Listing> {
    // Only the stamps the caller actually passed go into $set, an absent key
    // leaves the stored value alone rather than nulling it.
    const patch: Record<string, unknown> = { status };
    for (const key of ['submittedAt', 'publishedAt', 'reviewNote'] as const) {
      if (trail[key] !== undefined) patch[key] = trail[key];
    }
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: patch }, { new: true })
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
