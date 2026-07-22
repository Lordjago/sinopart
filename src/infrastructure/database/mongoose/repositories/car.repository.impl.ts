/**
 * CarRepositoryImpl — the ADAPTER that implements the CarRepository port
 * ---------------------------------------------------------------------------
 * Translates the core's storage contract into MongoDB queries via the Mongoose
 * Model, mapping documents ⇄ `Car` entities. Bound to the CAR_REPOSITORY token
 * in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CarMapper } from '../../../../application/mappers/car.mapper';
import type { Car } from '../../../../core/domain/entities/car';
import type {
  CarFilters,
  CarRepository,
} from '../../../../core/interfaces/repository/car.repository';
import { CarDocument } from '../documents/car.document';

@Injectable()
export class CarRepositoryImpl implements CarRepository {
  constructor(
    @InjectModel('cars') private readonly model: Model<CarDocument>,
  ) {}

  async find(filters: CarFilters): Promise<Car[]> {
    // Build the query only from filters that were actually provided.
    const query: FilterQuery<CarDocument> = {};
    if (filters.make) query.make = filters.make;
    if (filters.status) query.status = filters.status;

    const docs = await this.model.find(query).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => CarMapper.toDomain(doc)!);
  }

  async findBySlug(slug: string): Promise<Car | null> {
    const doc = await this.model.findOne({ slug }).exec();
    return CarMapper.toDomain(doc);
  }
}
