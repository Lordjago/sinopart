/**
 * UserRepositoryImpl: the ADAPTER that implements the UserRepository port
 * ---------------------------------------------------------------------------
 * This is where the core's storage contract meets real MongoDB. It receives the
 * Mongoose Model via `@InjectModel`, runs the queries, and uses UserMapper to
 * translate documents ⇄ domain entities so callers only ever see entities.
 *
 * It is bound to the USER_REPOSITORY token in database.module, which is how use
 * cases (which depend on the interface, not this class) receive it.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { UserMapper } from '../../../../application/mappers/user.mapper';
import type { User, UserRole } from '../../../../core/domain/entities/user';
import { Page } from '../../../../core/domain/value-object/page';
import type {
  UserFilters,
  UserRepository,
} from '../../../../core/interfaces/repository/user.repository';
import { UserDocument } from '../documents/user.document';
import { contains } from '../query.util';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectModel('users') private readonly model: Model<UserDocument>,
  ) {}

  async create(user: User): Promise<User> {
    const created = await this.model.create(UserMapper.toPersistence(user));
    return UserMapper.toDomain(created)!;
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    const query = this.model.findOne({ email: email.toLowerCase().trim() });
    // Opt the normally-hidden hash back in only when login asks for it.
    if (withPassword) query.select('+passwordHash');
    const doc = await query.exec();
    return UserMapper.toDomain(doc);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.model.findById(id).exec();
    return UserMapper.toDomain(doc);
  }

  async findAll(filters: UserFilters): Promise<Page<User>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 20);

    const query: FilterQuery<UserDocument> = {};
    if (filters.roles?.length) query.role = { $in: filters.roles };
    if (filters.verified != null) query.verified = filters.verified;
    if (filters.search) {
      const term = contains(filters.search);
      query.$or = [{ name: term }, { email: term }, { business: term }];
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
      docs.map((d) => UserMapper.toDomain(d)!),
      page,
      limit,
      total,
    );
  }

  async countByRole(): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ])
      .exec();
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  }

  async existsWithRole(role: UserRole): Promise<boolean> {
    return (await this.model.exists({ role })) != null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.model
      .updateOne({ _id: userId }, { $set: { passwordHash } })
      .exec();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.model
      .updateOne({ _id: userId }, { $set: { emailVerified: true } })
      .exec();
  }

  async setVerified(userId: string, verified: boolean): Promise<User> {
    const updated = await this.model
      .findByIdAndUpdate(userId, { $set: { verified } }, { new: true })
      .exec();
    return UserMapper.toDomain(updated)!;
  }

  async setKycStatus(userId: string, status: string | null): Promise<User> {
    const updated = await this.model
      .findByIdAndUpdate(userId, { $set: { kycStatus: status } }, { new: true })
      .exec();
    return UserMapper.toDomain(updated)!;
  }
}
