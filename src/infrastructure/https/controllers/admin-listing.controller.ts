/**
 * AdminListingController: the only place a car can reach the marketplace.
 * ---------------------------------------------------------------------------
 *   GET  /admin/listings              (staff) -> every listing, any status
 *   GET  /admin/listings/:id          (staff) -> one listing in full, to read
 *                                                before deciding
 *   POST /admin/listings/:id/publish  (admin) -> take it live
 *   POST /admin/listings/:id/return   (admin) -> back to the supplier, with why
 *   POST /admin/listings/:id/pause    (admin) -> pull it off the marketplace
 *   POST /admin/listings/:id/catalog-entry (admin) -> add the car the supplier
 *                                       typed to the catalog
 *
 * The supplier's own route stops at SUBMITTED, so publishing being ADMIN-only
 * here is what actually enforces "nothing reaches dealers unreviewed",
 * everything else is presentation.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { UserRole } from '../../../core/domain/entities/user';
import { ListAdminListingsUseCase } from '../../../core/usecase/admin/list-admin-listings.usecase';
import { GetAdminListingUseCase } from '../../../core/usecase/admin/get-admin-listing.usecase';
import { AddProposedVehicleUseCase } from '../../../core/usecase/admin/add-proposed-vehicle.usecase';
import {
  PauseListingAdminUseCase,
  PublishListingAdminUseCase,
  ReturnListingUseCase,
} from '../../../core/usecase/admin/publish-listing-admin.usecase';
import {
  ListAdminListingsDto,
  ReturnListingDto,
} from '../../../application/dtos/admin/list-admin-listings.dto';

@Controller('admin/listings')
export class AdminListingController {
  constructor(
    private readonly listListings: ListAdminListingsUseCase,
    private readonly getListing: GetAdminListingUseCase,
    private readonly publishListing: PublishListingAdminUseCase,
    private readonly returnListing: ReturnListingUseCase,
    private readonly pauseListing: PauseListingAdminUseCase,
    private readonly addProposedVehicle: AddProposedVehicleUseCase,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get()
  list(@Query() dto: ListAdminListingsDto) {
    return this.listListings.execute(dto);
  }

  // Readable by both back-office roles: looking at a car is not a decision.
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getListing.execute(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.publishListing.execute(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/return')
  sendBack(@Param('id') id: string, @Body() dto: ReturnListingDto) {
    return this.returnListing.execute({ listingId: id, reason: dto.reason });
  }

  /**
   * Add the car the supplier typed to the catalog. Does not touch the listing:
   * the store re-picks the new entry itself, usually after a /return.
   */
  @Roles(UserRole.ADMIN)
  @Post(':id/catalog-entry')
  addCatalogEntry(@Param('id') id: string) {
    return this.addProposedVehicle.execute(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.pauseListing.execute(id);
  }
}
