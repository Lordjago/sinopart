/**
 * SubmitListingUseCase: a supplier sends a car for review (POST /listings/:id/publish)
 * ---------------------------------------------------------------------------
 * This used to publish. It no longer can: a listing reaching dealers is an
 * admin decision, so the furthest a supplier can move their own car is
 * SUBMITTED, and only the back office can turn that into AVAILABLE.
 *
 * The route keeps its name so the supplier app's existing call site still
 * works; what changed is the state it lands in, and the wording around it.
 *
 * The completeness and verified-store checks stay here rather than waiting for
 * the reviewer. A store learning that its VIN is missing the moment it hits
 * submit is a better experience than learning it days later from a rejection,
 * and it keeps unreviewable work out of the queue.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import {
  SUBMITTABLE_STATUSES,
  missingForSubmit,
  ListingStatus,
  type Listing,
} from '../../domain/entities/listing';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface SubmitListingInput {
  supplierId: string;
  listingId: string;
}

@Injectable()
export class SubmitListingUseCase extends BaseUseCase<
  SubmitListingInput,
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
  }: SubmitListingInput): Promise<Listing> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ResourceNotFoundError('Listing not found.');
    if (listing.supplierId !== supplierId) {
      throw new ForbiddenError('This listing belongs to another store.');
    }
    if (listing.status === ListingStatus.SUBMITTED) {
      throw new ValidationError(
        'This listing is already with our team for review.',
      );
    }
    if (!SUBMITTABLE_STATUSES.has(listing.status)) {
      throw new ValidationError(
        'Only a draft or paused listing can be submitted.',
      );
    }

    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new ForbiddenError('Supplier not found.');
    if (supplier.accountStatus !== SupplierAccountStatus.VERIFIED) {
      throw new ForbiddenError(
        'Your store must be verified before you can submit a car for listing.',
      );
    }

    const missing = missingForSubmit(listing);
    if (missing.length) {
      throw new ValidationError(
        `Complete these before submitting: ${missing.join(', ')}.`,
      );
    }

    // Submitting answers whatever the last review asked for, so the note goes
    // with it. The supplier is no longer being asked to fix that thing.
    return this.listings.setStatus(listingId, ListingStatus.SUBMITTED, {
      submittedAt: new Date(),
      reviewNote: null,
    });
  }
}
