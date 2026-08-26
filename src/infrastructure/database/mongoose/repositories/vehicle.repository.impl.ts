/**
 * VehicleRepositoryImpl: the ADAPTER for the VehicleRepository port.
 * Bound to VEHICLE_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { VehicleMapper } from '../../../../application/mappers/vehicle.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import type { Vehicle } from '../../../../core/domain/entities/vehicle';
import type {
  VehicleFilters,
  VehicleKey,
  VehicleRepository,
} from '../../../../core/interfaces/repository/vehicle.repository';
import { VehicleDocument } from '../documents/vehicle.document';
import { equalsIgnoreCase } from '../query.util';

@Injectable()
export class VehicleRepositoryImpl implements VehicleRepository {
  constructor(
    @InjectModel('vehicles') private readonly model: Model<VehicleDocument>,
  ) {}

  async create(vehicle: Vehicle): Promise<Vehicle> {
    const created = await this.model.create(
      VehicleMapper.toPersistence(vehicle),
    );
    return VehicleMapper.toDomain(created)!;
  }

  async findById(id: string): Promise<Vehicle | null> {
    if (!this.isValidId(id)) return null;
    const doc = await this.model.findById(id).exec();
    return VehicleMapper.toDomain(doc);
  }

  async findByKey(key: VehicleKey): Promise<Vehicle | null> {
    if (!this.isValidId(key.seriesId)) return null;
    // Case-insensitive on the two free-text columns: "Petrol" and "petrol" are
    // one fuel type, and the unique index would not catch the second spelling.
    const doc = await this.model
      .findOne({
        seriesId: key.seriesId,
        year: key.year,
        variant: key.variant,
        fuelType: equalsIgnoreCase(key.fuelType),
        transmission: equalsIgnoreCase(key.transmission),
      })
      .exec();
    return VehicleMapper.toDomain(doc);
  }

  async findAll(filters: VehicleFilters): Promise<Page<Vehicle>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    const query: FilterQuery<VehicleDocument> = {};
    if (filters.seriesId) {
      // An unparseable id matches nothing rather than throwing a CastError.
      if (!this.isValidId(filters.seriesId))
        return new Page([], page, limit, 0);
      query.seriesId = filters.seriesId;
    } else if (filters.seriesIds) {
      const ids = filters.seriesIds.filter((id) => this.isValidId(id));
      // An empty list means "no series matched the brand", which is NOT the
      // same as "no filter", so return nothing rather than the whole table.
      if (!ids.length) return new Page([], page, limit, 0);
      query.seriesId = { $in: ids };
    }
    if (filters.year != null) query.year = filters.year;
    if (filters.fuelType) query.fuelType = equalsIgnoreCase(filters.fuelType);
    if (filters.transmission) {
      query.transmission = equalsIgnoreCase(filters.transmission);
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ year: -1, variant: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return new Page(
      docs.map((d) => VehicleMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async countBySeries(seriesId: string): Promise<number> {
    if (!this.isValidId(seriesId)) return 0;
    return this.model.countDocuments({ seriesId }).exec();
  }

  async update(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
    const updated = await this.model
      .findByIdAndUpdate(
        id,
        { $set: VehicleMapper.toUpdate(patch) },
        { new: true },
      )
      .exec();
    return VehicleMapper.toDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }

  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }
}
