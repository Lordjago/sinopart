/**
 * Admin listing decisions: publish, return, pause.
 * (POST /admin/listings/:id/{publish,return,pause})
 * ---------------------------------------------------------------------------
 * Going live is an ADMIN action now. The supplier's own transition stops at
 * SUBMITTED (see SubmitListingUseCase), and only this file can produce
 * AVAILABLE, which is the single fact that keeps an unreviewed car off the
 * dealer catalog.
 *
 * The two business gates the supplier flow already enforced still apply, and
 * for the same reasons. An admin can decide WHETHER to publish, not whether
 * the rules hold:
 *   - the owning store must be VERIFIED (an unverified store cannot trade), and
 *   - the listing must be complete (missingForPublish is empty).
 *
 * Returning a listing sends it back to DRAFT with a note. That note is the only
 * explanation the supplier ever sees, which is why the DTO makes it mandatory.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import {
  ListingStatus,
  PUBLISHABLE_STATUSES,
  RETURNABLE_STATUSES,
  missingForPublish,
  type Listing,
} from '../../domain/entities/listing';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

@Injectable()
export class PublishListingAdminUseCase extends BaseUseCase<string, Listing> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(listingId: string): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');

    if (!PUBLISHABLE_STATUSES.has(listing.status)) {
      throw new ValidationError(
        `A ${listing.status} listing cannot be published.`,
      );
    }

    const supplier = await this.suppliers.findById(listing.supplierId);
    if (!supplier) {
      throw new ValidationError('This listing has no owning store.');
    }
    if (supplier.accountStatus !== SupplierAccountStatus.VERIFIED) {
      throw new ValidationError(
        `${supplier.storeName} is not verified yet, so its cars cannot go live.`,
      );
    }

    const missing = missingForPublish(listing);
    if (missing.length) {
      throw new ValidationError(
        `This listing is incomplete: ${missing.join(', ')}.`,
      );
    }

    // Publishing clears the review note: whatever it once said has now been
    // answered, and leaving it would show the supplier a stale complaint
    // against a car that is live.
    return this.listings.setStatus(listingId, ListingStatus.AVAILABLE, {
      publishedAt: new Date(),
      reviewNote: null,
    });
  }
}

export interface ReturnListingInput {
  listingId: string;
  reason: string;
}

@Injectable()
export class ReturnListingUseCase extends BaseUseCase<
  ReturnListingInput,
  Listing
> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute({ listingId, reason }: ReturnListingInput): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');

    if (!RETURNABLE_STATUSES.has(listing.status)) {
      throw new ValidationError(
        `A ${listing.status} listing cannot be sent back to the supplier.`,
      );
    }

    return this.listings.setStatus(listingId, ListingStatus.DRAFT, {
      reviewNote: reason.trim(),
      submittedAt: null,
    });
  }
}

/**
 * Take a live listing off the marketplace without bouncing it back to the
 * supplier. PAUSED, so an admin can relist it with one click.
 */
@Injectable()
export class PauseListingAdminUseCase extends BaseUseCase<string, Listing> {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(listingId: string): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');

    if (listing.status !== ListingStatus.AVAILABLE) {
      throw new ValidationError('Only a live listing can be paused.');
    }

    return this.listings.setStatus(listingId, ListingStatus.PAUSED);
  }
}
