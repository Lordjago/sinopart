/**
 * SavedListingRepositoryImpl: the ADAPTER for the SavedListingRepository port.
 * Bound to SAVED_LISTING_REPOSITORY in database.module.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import type { SavedListing } from '../../../../core/domain/entities/saved-listing';
import type { SavedListingRepository } from '../../../../core/interfaces/repository/saved-listing.repository';
import { SavedListingDocument } from '../documents/saved-listing.document';
import { idOf } from '../../../../application/mappers/ref.util';

@Injectable()
export class SavedListingRepositoryImpl implements SavedListingRepository {
  constructor(
    @InjectModel('saved_listings')
    private readonly model: Model<SavedListingDocument>,
  ) {}

  async save(userId: string, listingId: string): Promise<SavedListing> {
    // Upsert against the unique index: saving an already-saved car returns the
    // existing row rather than failing, which is what makes the endpoint safe
    // to call from a toggle that may double-fire.
    const doc = await this.model
      .findOneAndUpdate(
        { userId, listingId },
        { $setOnInsert: { userId, listingId } },
        { new: true, upsert: true },
      )
      .exec();
    return this.toDomain(doc)!;
  }

  async remove(userId: string, listingId: string): Promise<void> {
    if (!isValidObjectId(listingId)) return;
    await this.model.deleteOne({ userId, listingId }).exec();
  }

  async findByUser(userId: string): Promise<SavedListing[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => this.toDomain(d)!);
  }

  async findSavedIds(userId: string, listingIds: string[]): Promise<string[]> {
    const valid = listingIds.filter((id) => isValidObjectId(id));
    if (!valid.length) return [];
    const docs = await this.model
      .find({ userId, listingId: { $in: valid } })
      .select({ listingId: 1 })
      .exec();
    return docs.map((d) => idOf(d.listingId)!);
  }

  private toDomain(doc: SavedListingDocument | null): SavedListing | null {
    if (!doc) return null;
    // `timestamps: true` puts createdAt/updatedAt on the document at runtime,
    // but they are not on the @Schema class, so the object is read loosely.
    const raw = doc.toObject() as Record<string, any>;
    return {
      _id: raw._id?.toString(),
      userId: idOf(raw.userId)!,
      listingId: idOf(raw.listingId)!,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as SavedListing;
  }
}
