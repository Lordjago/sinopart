/**
 * UserRepositoryImpl — the ADAPTER that implements the UserRepository port
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
import { Model } from 'mongoose';
import { UserMapper } from '../../../../application/mappers/user.mapper';
import type { User } from '../../../../core/domain/entities/user';
import type { UserRepository } from '../../../../core/interfaces/repository/user.repository';
import { UserDocument } from '../documents/user.document';

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
}
