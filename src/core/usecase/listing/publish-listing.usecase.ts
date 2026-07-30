/**
 * PublishListingUseCase — take a saved listing live (→ available).
 * ---------------------------------------------------------------------------
 * Covers both "publish this draft" and "relist" (from paused). Same gate as
 * create-with-publish: the store must be VERIFIED and the listing complete.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import {
  PUBLISHABLE_STATUSES,
  missingForPublish,
  ListingStatus,
  type Listing,
} from '../../domain/entities/listing';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface PublishListingInput {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class PublishListingUseCase extends BaseUseCase<
  PublishListingInput,
  Listing
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute({
    supplierId,
    listingId,
  }: PublishListingInput): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');
    if (listing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    if (!PUBLISHABLE_STATUSES.has(listing.status)) {
      throw new ValidationError(
        'Only a draft or paused listing can be published.',
      );
    }

    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new ForbiddenError('Supplier not found.');
    if (supplier.accountStatus !== SupplierAccountStatus.VERIFIED) {
      throw new ForbiddenError(
        'Your store must be verified before a listing can go live.',
      );
    }

    const missing = missingForPublish(listing);
    if (missing.length) {
      throw new ValidationError(
        `Complete these before publishing: ${missing.join(', ')}.`,
      );
    }

    return this.listings.setStatus(listingId, ListingStatus.AVAILABLE);
  }
}
