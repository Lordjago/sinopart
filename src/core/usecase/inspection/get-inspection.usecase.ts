/**
 * GetInspectionUseCase: one inspection in full, for whoever is entitled to it.
 * ---------------------------------------------------------------------------
 * Three parties read the same record: the dealer who paid, the store whose yard
 * is being visited, and the back office. Access is decided HERE rather than in
 * three controllers, so there is one place to be right about who may read an
 * order that contains a VIN, a price and two people's contact details.
 *
 * `viewerId` is the id the caller is acting as. An admin passes none, which is
 * the only way to read an inspection you are not party to.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { toInspectionView, type InspectionView } from './inspection.view';

export type InspectionViewer = 'buyer' | 'supplier' | 'admin';

export interface GetInspectionInput {
  inspectionId: string;
  as: InspectionViewer;
  /** The buyer's or store's id. Absent for an admin. */
  viewerId?: string;
}

@Injectable()
export class GetInspectionUseCase extends BaseUseCase<
  GetInspectionInput,
  InspectionView
> {
  constructor(
    @Inject(INSPECTION_REPOSITORY)
    private readonly inspections: InspectionRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {
    super();
  }

  async execute({
    inspectionId,
    as,
    viewerId,
  }: GetInspectionInput): Promise<InspectionView> {
    const inspection = await this.inspections.findById(inspectionId);
    if (!inspection) throw new ResourceNotFoundError('Inspection not found.');

    if (as === 'buyer' && inspection.buyerId !== viewerId) {
      throw new ForbiddenError('This inspection belongs to another dealer.');
    }
    if (as === 'supplier' && inspection.supplierId !== viewerId) {
      throw new ForbiddenError('This inspection belongs to another store.');
    }

    const [listing, supplier, buyer] = await Promise.all([
      this.listings.findById(inspection.listingId),
      this.suppliers.findById(inspection.supplierId),
      this.users.findById(inspection.buyerId),
    ]);

    return toInspectionView(inspection, {
      listing,
      supplier,
      buyer,
      // Once a store has accepted, the two sides need to be able to reach each
      // other about the visit. Before that there is nothing to arrange.
      includeContact: as === 'admin' || Boolean(inspection.respondedAt),
      // The yard address goes only to the back office: the inspector attending
      // is the one who needs it, and the buyer never travels to the yard.
      includeAddress: as === 'admin',
    });
  }
}
