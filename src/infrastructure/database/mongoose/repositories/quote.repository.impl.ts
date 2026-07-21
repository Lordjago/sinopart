/**
 * QuoteRepositoryImpl — the ADAPTER implementing the QuoteRepository port
 * ---------------------------------------------------------------------------
 * Bound to the QUOTE_REPOSITORY token in database.module. All MongoDB
 * vocabulary stops here: the core asks for "name contains X, budget between
 * these figures, page 2" and this file turns that into $regex/$gte/skip/limit.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { QuoteMapper } from '../../../../application/mappers/quote.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import type { Quote } from '../../../../core/domain/entities/quote';
import type {
  QuoteFilters,
  QuoteRepository,
} from '../../../../core/interfaces/repository/quote.repository';
import { QuoteDocument } from '../documents/quote.document';
import { contains } from '../query.util';

@Injectable()
export class QuoteRepositoryImpl implements QuoteRepository {
  constructor(
    @InjectModel('quotes') private readonly model: Model<QuoteDocument>,
  ) {}

  async create(quote: Quote): Promise<Quote> {
    const created = await this.model.create(QuoteMapper.toPersistence(quote));
    return QuoteMapper.toDomain(created)!;
  }

  async find(filters: QuoteFilters): Promise<Page<Quote>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    // Build the query only from filters that were actually provided.
    const query: FilterQuery<QuoteDocument> = {};
    if (filters.name) query.name = contains(filters.name);
    if (filters.whatsAppNumber)
      query.whatsAppNumber = contains(filters.whatsAppNumber);
    if (filters.year !== undefined) query.year = filters.year;

    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
      const range: Record<string, number> = {};
      if (filters.minBudget !== undefined) range.$gte = filters.minBudget;
      if (filters.maxBudget !== undefined) range.$lte = filters.maxBudget;
      query.budget = range;
    }

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
      docs.map((doc) => QuoteMapper.toDomain(doc)!),
      page,
      limit,
      total,
    );
  }

  async findRecentByWhatsAppNumber(
    whatsAppNumber: string,
    since: Date,
  ): Promise<Quote | null> {
    const doc = await this.model
      .findOne({ whatsAppNumber, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .exec();
    return QuoteMapper.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
