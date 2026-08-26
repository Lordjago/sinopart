/**
 * A dealer's watchlist.
 *
 *   POST   /saved              (buyer) -> save a car
 *   DELETE /saved/:listingId   (buyer) -> unsave it
 *   GET    /saved              (buyer) -> the whole list, cars resolved
 *
 * Authenticated throughout, and the user id comes from the token rather than
 * the body: a watchlist belongs to exactly one account, and there is no shape
 * of request that could write to somebody else's.
 */
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import {
  ListSavedListingsUseCase,
  SaveListingUseCase,
  UnsaveListingUseCase,
} from '../../../core/usecase/saved/saved-listing.usecases';
import { SaveListingDto } from '../../../application/dtos/saved/save-listing.dto';

@Controller('saved')
export class SavedListingController {
  constructor(
    private readonly saveListing: SaveListingUseCase,
    private readonly unsaveListing: UnsaveListingUseCase,
    private readonly listSaved: ListSavedListingsUseCase,
  ) {}

  @Roles(UserRole.BUYER)
  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.listSaved.execute(user.id);
  }

  @Roles(UserRole.BUYER)
  @Post()
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveListingDto) {
    return this.saveListing.execute({
      userId: user.id,
      listingId: dto.listingId,
    });
  }

  @Roles(UserRole.BUYER)
  @Delete(':listingId')
  unsave(@CurrentUser() user: AuthUser, @Param('listingId') listingId: string) {
    return this.unsaveListing.execute({ userId: user.id, listingId });
  }
}
