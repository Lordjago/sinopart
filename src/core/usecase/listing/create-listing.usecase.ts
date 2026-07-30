/**
 * CreateListingUseCase — save a new listing as a draft, or publish it live.
 * ---------------------------------------------------------------------------
 * The verification gate lives HERE, not just in the UI: a store may always save
 * a draft, but publishing (status → available, visible to dealers) requires a
 * VERIFIED supplier and a complete listing. This is the server-side guarantee
 * behind "only verified stores can go live".
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import {
  deriveListingTitle,
  missingForPublish,
  ListingStatus,
  type Listing,
} from '../../domain/entities/listing';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface CreateListingInput extends Partial<Listing> {
  supplierId: string;
  publish?: boolean;
}

@Injectable()
export class CreateListingUseCase extends BaseUseCase<
  CreateListingInput,
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

  async execute(input: CreateListingInput): Promise<Listing> {
    const { publish, supplierId, ...fields } = input;

    let status = ListingStatus.DRAFT;

    if (publish) {
      const supplier = await this.suppliers.findById(supplierId);
      if (!supplier) throw new ForbiddenError('Supplier not found.');
      if (supplier.accountStatus !== SupplierAccountStatus.VERIFIED) {
        throw new ForbiddenError(
          'Your store must be verified before a listing can go live.',
        );
      }
      const missing = missingForPublish(fields);
      if (missing.length) {
        throw new ValidationError(
          `Complete these before publishing: ${missing.join(', ')}.`,
        );
      }
      status = ListingStatus.AVAILABLE;
    }

    const listing: Listing = {
      ...(fields as Partial<Listing>),
      supplierId,
      status,
      title: fields.title?.trim() || deriveListingTitle(fields),
      features: fields.features ?? [],
      photos: fields.photos ?? [],
    } as Listing;

    return this.listings.create(listing);
  }
}
