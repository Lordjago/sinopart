/**
 * ListInspectionsUseCase: one filtered page of inspections, resolved for a UI.
 * ---------------------------------------------------------------------------
 * Serves all three lists (the buyer's, the store's, the back office's) because
 * they differ only by which filter is forced. The CALLER forces it: a buyer's
 * request arrives with buyerId already pinned to their own id, so there is no
 * path where a filter in the query string reads someone else's orders.
 *
 * The car and the counterparty are resolved here rather than per row in the
 * client. The lists are short and the alternative is every screen firing a
 * request per row to turn an id into a car title.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type {
  InspectionFilters,
  InspectionRepository,
} from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import { Page } from '../../domain/value-object/page';
import type { Inspection } from '../../domain/entities/inspection';
import { toInspectionView, type InspectionView } from './inspection.view';

export interface ListInspectionsInput extends InspectionFilters {
  /** Back office only: adds phone/email so a visit can be arranged. */
  includeContact?: boolean;
  /** Back office only: adds the store's office address, so an inspector
   *  planning a day sees where each visit is without opening every row. */
  includeAddress?: boolean;
  /** Unpaginated, for the buyer's and store's own short lists. */
  all?: boolean;
}

@Injectable()
export class ListInspectionsUseCase extends BaseUseCase<
  ListInspectionsInput,
  Page<InspectionView>
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

  async execute(input: ListInspectionsInput): Promise<Page<InspectionView>> {
    const { includeContact, includeAddress, all, ...filters } = input;

    const page = all
      ? await this.allAsPage(filters)
      : await this.inspections.find(filters);

    const views = await Promise.all(
      page.data.map((inspection) =>
        this.resolve(inspection, includeContact, includeAddress),
      ),
    );

    return new Page(views, page.page, page.limit, page.total);
  }

  private async allAsPage(
    filters: InspectionFilters,
  ): Promise<Page<Inspection>> {
    const rows = await this.inspections.findAllFor(filters);
    return new Page(rows, 1, Math.max(1, rows.length), rows.length);
  }

  /**
   * A missing part is tolerated rather than fatal. A deleted store or listing
   * should leave the row readable, not blow up a whole page of orders.
   */
  private async resolve(
    inspection: Inspection,
    includeContact?: boolean,
    includeAddress?: boolean,
  ): Promise<InspectionView> {
    const [listing, supplier, buyer] = await Promise.all([
      this.listings.findById(inspection.listingId),
      this.suppliers.findById(inspection.supplierId),
      this.users.findById(inspection.buyerId),
    ]);
    return toInspectionView(inspection, {
      listing,
      supplier,
      buyer,
      includeContact,
      includeAddress,
    });
  }
}
