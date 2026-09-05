/**
 * OrderRepositoryImpl: the ADAPTER for the OrderRepository port.
 * Bound to ORDER_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, isValidObjectId } from 'mongoose';
import { OrderMapper } from '../../../../application/mappers/order.mapper';
import { Page } from '../../../../core/domain/value-object/page';
import {
  ACTIVE_ORDER_STATUSES,
  type Order,
} from '../../../../core/domain/entities/order';
import type {
  OrderFilters,
  OrderRepository,
} from '../../../../core/interfaces/repository/order.repository';
import { OrderDocument } from '../documents/order.document';
import { contains } from '../query.util';

@Injectable()
export class OrderRepositoryImpl implements OrderRepository {
  constructor(
    @InjectModel('orders') private readonly model: Model<OrderDocument>,
  ) {}

  async create(order: Order): Promise<Order> {
    const created = await this.model.create(OrderMapper.toPersistence(order));
    return OrderMapper.toDomain(created)!;
  }

  async findById(id: string): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return OrderMapper.toDomain(await this.model.findById(id).exec());
  }

  async findActiveForListing(listingId: string): Promise<Order | null> {
    if (!isValidObjectId(listingId)) return null;
    const doc = await this.model
      .findOne({ listingId, status: { $in: [...ACTIVE_ORDER_STATUSES] } })
      .sort({ createdAt: -1 })
      .exec();
    return OrderMapper.toDomain(doc);
  }

  async findByInspection(inspectionId: string): Promise<Order | null> {
    if (!isValidObjectId(inspectionId)) return null;
    return OrderMapper.toDomain(
      await this.model.findOne({ inspectionId }).exec(),
    );
  }

  async find(filters: OrderFilters): Promise<Page<Order>> {
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
      docs.map((d) => OrderMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async findAllFor(filters: OrderFilters): Promise<Order[]> {
    const docs = await this.model
      .find(this.toQuery(filters))
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => OrderMapper.toDomain(d)!);
  }

  async update(id: string, patch: Partial<Order>): Promise<Order> {
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: OrderMapper.toUpdate(patch) }, { new: true })
      .exec();
    return OrderMapper.toDomain(updated)!;
  }

  private toQuery(filters: OrderFilters): FilterQuery<OrderDocument> {
    const query: FilterQuery<OrderDocument> = {};
    if (filters.status) query.status = filters.status;
    if (filters.buyerId) query.buyerId = filters.buyerId;
    if (filters.supplierId) query.supplierId = filters.supplierId;
    if (filters.listingId) query.listingId = filters.listingId;
    if (filters.search) query.reference = contains(filters.search);
    return query;
  }
}
