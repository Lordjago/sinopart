/**
 * GetUserUseCase: one account in full (GET /admin/users/:source/:id)
 * ---------------------------------------------------------------------------
 * The screen behind a row in the users directory. Which collection to read is
 * not something the panel should have to guess, and an id alone cannot say:
 * suppliers live in `suppliers` and dealers/inspectors/admins in `users`, and
 * the two id spaces are unrelated. `source` comes down the URL; it is already
 * on every directory row for exactly this reason.
 *
 * A supplier's page answers "who is this store" (profile + KYC submission) and
 * "what are they selling" (every listing they own, any status) in ONE call, so
 * the screen doesn't fire three requests and juggle three loading states.
 *
 * A user's page is thinner by nature: dealers have no documents and no
 * inventory, so it is the profile plus the two verification flags, the KYC one
 * an admin sets by hand, and the email one the sign-up flow sets.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  LISTING_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import { UserRole } from '../../domain/entities/user';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import type { AdminListingView, UserDetailView } from './admin.views';
import { toKycSubmissionView } from './kyc-submission.view';
import { toAdminListingView } from './admin-listing.view';

export type UserSource = 'user' | 'supplier';

export interface GetUserInput {
  source: UserSource;
  id: string;
}

@Injectable()
export class GetUserUseCase extends BaseUseCase<GetUserInput, UserDetailView> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute({ source, id }: GetUserInput): Promise<UserDetailView> {
    if (source !== 'user' && source !== 'supplier') {
      throw new ValidationError(
        "Unknown directory source: expected 'user' or 'supplier'.",
      );
    }
    return source === 'supplier'
      ? this.supplierDetail(id)
      : this.userDetail(id);
  }

  private async supplierDetail(id: string): Promise<UserDetailView> {
    const supplier = await this.suppliers.findById(id);
    if (!supplier) throw new ResourceNotFoundError('Supplier not found.');

    // Every listing, any status. The whole point of the page is seeing the
    // drafts and the paused ones too, not just what a dealer would see.
    const owned = await this.listings.findBySupplier(id);
    const listings = owned.map((l) => toAdminListingView(l, supplier));

    return {
      id: supplier._id!,
      source: 'supplier',
      role: UserRole.SELLER,
      name: supplier.storeName,
      business: supplier.legalName ?? '',
      email: supplier.contactEmail ?? null,
      phone: supplier.phone,
      status: supplier.accountStatus,
      kycVerified: supplier.accountStatus === SupplierAccountStatus.VERIFIED,
      kycSubmitted: (supplier.kycDocuments?.length ?? 0) > 0,
      tier: supplier.tier,
      joinedAt: supplier.createdAt,

      province: supplier.province ?? null,
      officeAddress: supplier.officeAddress ?? null,
      invitedBy: supplier.invitedBy ?? null,
      termsAcceptedAt: supplier.termsAcceptedAt ?? null,
      emailVerified: null,
      kyc: toKycSubmissionView(supplier),
      listings,
      listingCounts: tally(listings),
      updatedAt: supplier.updatedAt,
    };
  }

  private async userDetail(id: string): Promise<UserDetailView> {
    const user = await this.users.findById(id);
    if (!user) throw new ResourceNotFoundError('User not found.');

    return {
      id: user._id!,
      source: 'user',
      role: user.role,
      name: user.name,
      business: user.business ?? '',
      email: user.email,
      phone: user.phone || null,
      status: 'active',
      kycVerified: user.verified,
      kycSubmitted: false,
      tier: user.tier,
      joinedAt: user.createdAt,

      province: null,
      officeAddress: null,
      invitedBy: null,
      termsAcceptedAt: null,
      emailVerified: user.emailVerified,
      kyc: null,
      listings: [],
      listingCounts: {},
      updatedAt: user.updatedAt,
    };
  }
}

/** `{ draft: 3, available: 11 }`. Statuses nobody is in stay absent. */
function tally(listings: AdminListingView[]): Record<string, number> {
  return listings.reduce<Record<string, number>>((counts, listing) => {
    counts[listing.status] = (counts[listing.status] ?? 0) + 1;
    return counts;
  }, {});
}
