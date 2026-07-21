/**
 * WaitListRepositoryImpl — the ADAPTER implementing the WaitListRepository port
 * ---------------------------------------------------------------------------
 * Bound to the WAITLIST_REPOSITORY token in database.module. All MongoDB
 * vocabulary stops here: the core asks for "email contains X, created between
 * these dates, page 2" and this file turns that into $regex/$gte/skip/limit.
 *
 * This is the first repository to return a real paginated `Page<T>`, so `find`
 * runs the query and the count together and hands both to the Page constructor.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { WaitListMapper } from '../../../../application/mappers/waitlist.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import type { WaitList } from '../../../../core/domain/entities/waitlist';
import type {
  WaitListFilters,
  WaitListRepository,
} from '../../../../core/interfaces/repository/waitlist.repository';
import { WaitListDocument } from '../documents/waitlist.document';
import { contains } from '../query.util';

@Injectable()
export class WaitListRepositoryImpl implements WaitListRepository {
  constructor(
    @InjectModel('waitlist') private readonly model: Model<WaitListDocument>,
  ) {}

  async create(waitlist: WaitList): Promise<WaitList> {
    const created = await this.model.create(
      WaitListMapper.toPersistence(waitlist),
    );
    return WaitListMapper.toDomain(created)!;
  }

  async find(filters: WaitListFilters): Promise<Page<WaitList>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    // Build the query only from filters that were actually provided.
    const query: FilterQuery<WaitListDocument> = {};
    if (filters.email) query.email = contains(filters.email);
    if (filters.name) query.name = contains(filters.name);
    if (filters.dealership) query.dealership = contains(filters.dealership);
    if (filters.whatsAppNumber)
      query.whatsAppNumber = contains(filters.whatsAppNumber);
    if (filters.city) query.city = contains(filters.city);

    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = filters.from;
      if (filters.to) range.$lte = filters.to;
      query.createdAt = range;
    }

    // Rows and total in one round trip — the count must use the same query, or
    // totalPages will disagree with what the caller actually received.
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
      docs.map((doc) => WaitListMapper.toDomain(doc)!),
      page,
      limit,
      total,
    );
  }

  async findByEmail(email: string): Promise<WaitList | null> {
    // Match the schema's lowercase/trim normalisation, otherwise the duplicate
    // check misses "A@B.com" for a row stored as "a@b.com".
    const doc = await this.model
      .findOne({ email: email.toLowerCase().trim() })
      .exec();
    return WaitListMapper.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
