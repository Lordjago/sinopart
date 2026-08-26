/**
 * The two sides of an inspection that are not the back office.
 *
 *   POST /inspections                  (buyer)    -> pay, reserving the car
 *   GET  /inspections                  (buyer)    -> my inspections
 *   GET  /inspections/:id              (buyer)    -> one, for the tracking screen
 *   GET  /inspections/supplier/mine    (seller)   -> requests on my yard
 *   POST /inspections/:id/accept       (seller)   -> agree to the visit
 *   POST /inspections/:id/decline      (seller)   -> refuse, releasing the car
 *
 * Every route is authenticated. Paying anonymously is not a thing: the fee buys
 * a reservation, and a reservation with no owner cannot be honoured.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { StartInspectionUseCase } from '../../../core/usecase/inspection/start-inspection.usecase';
import { ListInspectionsUseCase } from '../../../core/usecase/inspection/list-inspections.usecase';
import { GetInspectionUseCase } from '../../../core/usecase/inspection/get-inspection.usecase';
import { RespondInspectionUseCase } from '../../../core/usecase/inspection/respond-inspection.usecase';
import {
  ListInspectionsDto,
  RespondInspectionDto,
  StartInspectionDto,
} from '../../../application/dtos/inspection/inspection.dto';

@Controller('inspections')
export class InspectionController {
  constructor(
    private readonly startInspection: StartInspectionUseCase,
    private readonly listInspections: ListInspectionsUseCase,
    private readonly getInspection: GetInspectionUseCase,
    private readonly respondInspection: RespondInspectionUseCase,
  ) {}

  /**
   * Standing in for a payment gateway. When one is wired in it verifies the
   * charge and passes its reference through; the reservation logic is unchanged.
   */
  @Roles(UserRole.BUYER)
  @Post()
  start(@CurrentUser() user: AuthUser, @Body() dto: StartInspectionDto) {
    return this.startInspection.execute({
      buyerId: user.id,
      listingId: dto.listingId,
    });
  }

  // buyerId is pinned to the caller, so the query string cannot widen it.
  @Roles(UserRole.BUYER)
  @Get()
  mine(@CurrentUser() user: AuthUser, @Query() dto: ListInspectionsDto) {
    return this.listInspections.execute({
      ...dto,
      buyerId: user.id,
      all: true,
    });
  }

  @Roles(UserRole.SELLER)
  @Get('supplier/mine')
  forMyYard(@CurrentUser() user: AuthUser, @Query() dto: ListInspectionsDto) {
    return this.listInspections.execute({
      ...dto,
      supplierId: user.id,
      all: true,
    });
  }

  @Roles(UserRole.SELLER)
  @Post(':id/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondInspectionDto,
  ) {
    return this.respondInspection.execute({
      supplierId: user.id,
      inspectionId: id,
      accept: true,
      note: dto.note,
    });
  }

  @Roles(UserRole.SELLER)
  @Post(':id/decline')
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondInspectionDto,
  ) {
    return this.respondInspection.execute({
      supplierId: user.id,
      inspectionId: id,
      accept: false,
      note: dto.note,
    });
  }

  /**
   * Last, so `supplier/mine` above is not swallowed by the `:id` pattern.
   * Either party may read their own; the use case decides which.
   */
  @Roles(UserRole.BUYER, UserRole.SELLER)
  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getInspection.execute({
      inspectionId: id,
      as: user.role === UserRole.SELLER ? 'supplier' : 'buyer',
      viewerId: user.id,
    });
  }
}
