/**
 * GetDashboardUseCase: the numbers the admin home screen opens on.
 * (GET /admin/dashboard)
 * ---------------------------------------------------------------------------
 * Every figure here is a COUNT computed in the database, not a list length: the
 * dashboard must stay cheap however large the platform gets, and a tile that
 * quietly counts only the first page is worse than no tile.
 *
 * The five counts run concurrently: they share no data, so the screen costs
 * one round trip's worth of latency rather than five.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INVITATION_REPOSITORY,
  LISTING_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
} from '../../injection.token';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { InvitationRepository } from '../../interfaces/repository/invitation.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import { InvitationStatus } from '../../domain/entities/invitation';
import { ListingStatus } from '../../domain/entities/listing';
import { SupplierAccountStatus } from '../../domain/entities/supplier';
import { UserRole } from '../../domain/entities/user';
import type { KycSubmissionView } from './admin.views';
import { toKycSubmissionView } from './kyc-submission.view';

export interface DashboardSummary {
  /** Headline tiles, each a single number the panel renders directly. */
  totals: {
    users: number;
    dealers: number;
    suppliers: number;
    staff: number;
    verifiedSuppliers: number;
    listings: number;
    liveListings: number;
    awaitingReview: number;
    kycAwaitingReview: number;
    activeInvitations: number;
  };
  /** Raw breakdowns, so the panel can chart without another call. */
  byRole: Record<string, number>;
  supplierByStatus: Record<string, number>;
  listingByStatus: Record<string, number>;
  invitationByStatus: Record<string, number>;
  /** The top of the KYC queue, so the home screen can link straight into work. */
  recentSubmissions: KycSubmissionView[];
}

@Injectable()
export class GetDashboardUseCase extends BaseUseCase<void, DashboardSummary> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(): Promise<DashboardSummary> {
    const [byRole, supplierByStatus, listingByStatus, invitationByStatus, queue] =
      await Promise.all([
        this.users.countByRole(),
        this.suppliers.countByStatus(),
        this.listings.countByStatus(),
        this.invitations.countByStatus(),
        this.suppliers.findAll({ withKycOnly: true, page: 1, limit: 5 }),
      ]);

    const sum = (counts: Record<string, number>) =>
      Object.values(counts).reduce((total, n) => total + n, 0);

    const dealers = byRole[UserRole.BUYER] ?? 0;
    const staff =
      (byRole[UserRole.ADMIN] ?? 0) + (byRole[UserRole.INSPECTOR] ?? 0);
    const suppliers = sum(supplierByStatus);

    return {
      totals: {
        users: dealers + staff + suppliers,
        dealers,
        suppliers,
        staff,
        verifiedSuppliers:
          supplierByStatus[SupplierAccountStatus.VERIFIED] ?? 0,
        listings: sum(listingByStatus),
        liveListings: listingByStatus[ListingStatus.AVAILABLE] ?? 0,
        awaitingReview: listingByStatus[ListingStatus.SUBMITTED] ?? 0,
        // Stores sitting in REVIEW are the ones a reviewer is expected to pick
        // up; ACTION is back with the supplier and is not the queue's problem.
        kycAwaitingReview: supplierByStatus[SupplierAccountStatus.REVIEW] ?? 0,
        activeInvitations: invitationByStatus[InvitationStatus.ACTIVE] ?? 0,
      },
      byRole,
      supplierByStatus,
      listingByStatus,
      invitationByStatus,
      recentSubmissions: queue.data.map(toKycSubmissionView),
    };
  }
}
