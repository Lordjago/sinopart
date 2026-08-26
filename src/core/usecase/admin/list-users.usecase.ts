/**
 * ListUsersUseCase: the back-office directory (GET /admin/users)
 * ---------------------------------------------------------------------------
 * Four roles, two collections. Dealers, inspectors and admins are rows in
 * `users`; a supplier is a row in `suppliers` and has no user record at all,
 * they sign in by phone OTP and the SELLER role only ever exists as a JWT
 * claim. The panel still has to show them side by side.
 *
 * Filtering by role therefore picks a source:
 *   role=seller                  -> suppliers only
 *   role=buyer|admin|inspector   -> users only
 *   no role                      -> both, interleaved by join date
 *
 * The both-sources case is the awkward one, because a page of a merged list
 * cannot be expressed as one skip/limit against either collection. Rather than
 * pretend, this reads the first `page * limit` rows of each, merges, sorts and
 * slices the window it was asked for. Correct ordering across both, at the
 * cost of reading more rows the deeper you page. `limit` is capped at 100 by
 * the DTO to keep that window bounded; if the directory ever outgrows this,
 * the fix is a materialised people view, not a bigger read.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { User } from '../../domain/entities/user';
import { UserRole } from '../../domain/entities/user';
import {
  SupplierAccountStatus,
  type Supplier,
} from '../../domain/entities/supplier';
import { Page } from '../../domain/value-object/page';
import type { UserView } from './admin.views';

export interface ListUsersInput {
  role?: UserRole;
  search?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListUsersUseCase extends BaseUseCase<
  ListUsersInput,
  Page<UserView>
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(input: ListUsersInput = {}): Promise<Page<UserView>> {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.max(1, input.limit ?? 20);

    const wantsSuppliers = !input.role || input.role === UserRole.SELLER;
    const wantsUsers = !input.role || input.role !== UserRole.SELLER;

    // The window each source must supply for this page to be sliceable.
    const window = page * limit;

    const [userPage, supplierPage] = await Promise.all([
      wantsUsers
        ? this.users.findAll({
            roles: input.role ? [input.role] : this.nonSupplierRoles(),
            search: input.search,
            verified: input.verified,
            page: 1,
            limit: window,
          })
        : null,
      wantsSuppliers
        ? this.suppliers.findAll({
            search: input.search,
            page: 1,
            limit: window,
          })
        : null,
    ]);

    let rows: UserView[] = [
      ...(userPage?.data ?? []).map((u) => this.fromUser(u)),
      ...(supplierPage?.data ?? []).map((s) => this.fromSupplier(s)),
    ];

    // The supplier repository has no `verified` filter, a store's KYC state is
    // its account status, not a boolean column. So that filter is applied here
    // once both sources are in the same shape.
    if (input.verified != null) {
      rows = rows.filter((r) => r.kycVerified === input.verified);
    }

    rows.sort(
      (a, b) => (b.joinedAt?.getTime() ?? 0) - (a.joinedAt?.getTime() ?? 0),
    );

    // Totals come from the repositories' own counts, so they stay honest even
    // though the rows above are a bounded window.
    const total = (userPage?.total ?? 0) + (supplierPage?.total ?? 0);
    const start = (page - 1) * limit;

    return new Page(rows.slice(start, start + limit), page, limit, total);
  }

  /** Every role that lives in the `users` collection. */
  private nonSupplierRoles(): UserRole[] {
    return [UserRole.BUYER, UserRole.INSPECTOR, UserRole.ADMIN];
  }

  private fromUser(user: User): UserView {
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
    };
  }

  private fromSupplier(supplier: Supplier): UserView {
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
    };
  }
}
