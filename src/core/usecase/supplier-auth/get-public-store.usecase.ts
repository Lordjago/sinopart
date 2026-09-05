/**
 * GetPublicStoreUseCase: the store behind a car, as a dealer may see it.
 * ---------------------------------------------------------------------------
 * A dealer deciding whether to inspect a car is also deciding whether to trust
 * the store selling it, so the catalog needs a name and a standing to put next
 * to the listing. GetSupplierProfileUseCase already returns a Supplier, but it
 * returns ALL of one. Phone, legal name, contact email, every KYC document and
 * the payout account. That is the store's own view of itself and must never
 * reach a buyer.
 *
 * So this use case exists purely to narrow: it returns a hand-written view with
 * the display fields and nothing else. Adding a field to the Supplier entity
 * can therefore never leak it here. A new field has to be added to
 * `PublicStoreView` deliberately.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { LISTING_REPOSITORY, SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import {
  SupplierAccountStatus,
  type SupplierTier,
} from '../../domain/entities/supplier';
import { ListingStatus } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';

/** Everything a buyer-facing surface may know about a store. */
export interface PublicStoreView {
  id: string;
  storeName: string;
  province: string;
  tier: SupplierTier;
  /** Cleared KYC. The badge next to the store name. */
  verified: boolean;
  /** For "selling on SinoPart since …". */
  memberSince?: Date;
  /**
   * Cars this store has sold through Sinopart: the buyer's only evidence that
   * anyone has actually traded with them.
   *
   * Reads 0 on every store today. `ListingStatus.SOLD` is declared but nothing
   * writes it — a car stops at RESERVED when its inspection is paid for, and a
   * passing report deliberately leaves it there while the buyer decides. The
   * figure starts counting on its own once a purchase step moves a listing on,
   * so a zero here is the current state of the lifecycle, not a bug.
   */
  soldCount: number;
}

@Injectable()
export class GetPublicStoreUseCase extends BaseUseCase<
  string,
  PublicStoreView
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(supplierId: string): Promise<PublicStoreView> {
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) {
      throw new ResourceNotFoundError('Store not found.');
    }

    // After the existence check, so a request for a store that does not exist
    // does not also run an aggregation to answer nobody.
    const counts = await this.listings.countByStatus(supplierId);

    return {
      id: supplier._id!,
      storeName: supplier.storeName,
      province: supplier.province ?? '',
      tier: supplier.tier,
      verified: supplier.accountStatus === SupplierAccountStatus.VERIFIED,
      memberSince: supplier.createdAt,
      // A status nobody is in is absent from the tally, not zero.
      soldCount: counts[ListingStatus.SOLD] ?? 0,
    };
  }
}
