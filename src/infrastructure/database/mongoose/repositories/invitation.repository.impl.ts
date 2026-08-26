/**
 * InvitationRepositoryImpl: the ADAPTER implementing InvitationRepository.
 * Bound to INVITATION_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { InvitationMapper } from '../../../../application/mappers/invitation.mapper';
import type { Invitation } from '../../../../core/domain/entities/invitation';
import { InvitationStatus } from '../../../../core/domain/entities/invitation';
import { Page } from '../../../../core/domain/value-object/page';
import type {
  InvitationFilters,
  InvitationRepository,
} from '../../../../core/interfaces/repository/invitation.repository';
import { InvitationDocument } from '../documents/invitation.document';
import { contains } from '../query.util';

@Injectable()
export class InvitationRepositoryImpl implements InvitationRepository {
  constructor(
    @InjectModel('invitations')
    private readonly model: Model<InvitationDocument>,
  ) {}

  async create(invitation: Invitation): Promise<Invitation> {
    const created = await this.model.create(
      InvitationMapper.toPersistence(invitation),
    );
    return InvitationMapper.toDomain(created)!;
  }

  async findByCode(code: string): Promise<Invitation | null> {
    const doc = await this.model.findOne({ code }).exec();
    return InvitationMapper.toDomain(doc);
  }

  async findAll(filters: InvitationFilters): Promise<Page<Invitation>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    const query: FilterQuery<InvitationDocument> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const term = contains(filters.search);
      query.$or = [{ code: term }, { storeName: term }];
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
      docs.map((d) => InvitationMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  }

  async markConsumed(code: string, supplierId: string): Promise<void> {
    await this.model
      .updateOne(
        { code },
        {
          $set: {
            status: InvitationStatus.CONSUMED,
            consumedBySupplierId: supplierId,
          },
        },
      )
      .exec();
  }

  async revoke(code: string): Promise<Invitation | null> {
    // Only an ACTIVE invite can be revoked: a consumed one already created a
    // store, and revoking it would imply that store was never authorised.
    // Matching on status here makes that a single atomic write.
    const updated = await this.model
      .findOneAndUpdate(
        { code, status: InvitationStatus.ACTIVE },
        { $set: { status: InvitationStatus.REVOKED } },
        { new: true },
      )
      .exec();
    return InvitationMapper.toDomain(updated);
  }
}
