/**
 * InvitationRepositoryImpl — the ADAPTER implementing InvitationRepository.
 * Bound to INVITATION_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvitationMapper } from '../../../../application/mappers/invitation.mapper';
import type { Invitation } from '../../../../core/domain/entities/invitation';
import { InvitationStatus } from '../../../../core/domain/entities/invitation';
import type { InvitationRepository } from '../../../../core/interfaces/repository/invitation.repository';
import { InvitationDocument } from '../documents/invitation.document';

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
}
