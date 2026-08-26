import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../decorator/is-public.decorator';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { CreateListingUseCase } from '../../../core/usecase/listing/create-listing.usecase';
import { UpdateListingUseCase } from '../../../core/usecase/listing/update-listing.usecase';
import { SubmitListingUseCase } from '../../../core/usecase/listing/submit-listing.usecase';
import { PauseListingUseCase } from '../../../core/usecase/listing/pause-listing.usecase';
import { DeleteListingUseCase } from '../../../core/usecase/listing/delete-listing.usecase';
import { GetListingUseCase } from '../../../core/usecase/listing/get-listing.usecase';
import { ListSupplierListingsUseCase } from '../../../core/usecase/listing/list-supplier-listings.usecase';
import { ListPublicListingsUseCase } from '../../../core/usecase/listing/list-public-listings.usecase';
import { GetPublicListingUseCase } from '../../../core/usecase/listing/get-public-listing.usecase';
import { UploadListingPhotoUseCase } from '../../../core/usecase/listing/upload-listing-photo.usecase';
import { UploadListingVideoUseCase } from '../../../core/usecase/listing/upload-listing-video.usecase';
import { CreateListingDto } from '../../../application/dtos/listing/create-listing.dto';
import { UpdateListingDto } from '../../../application/dtos/listing/update-listing.dto';
import { PublicListingsDto } from '../../../application/dtos/listing/public-listings.dto';

@Controller('listings')
export class ListingController {
  constructor(
    private readonly createListing: CreateListingUseCase,
    private readonly updateListing: UpdateListingUseCase,
    private readonly submitListing: SubmitListingUseCase,
    private readonly pauseListing: PauseListingUseCase,
    private readonly deleteListing: DeleteListingUseCase,
    private readonly getListing: GetListingUseCase,
    private readonly listSupplierListings: ListSupplierListingsUseCase,
    private readonly listPublicListings: ListPublicListingsUseCase,
    private readonly getPublicListing: GetPublicListingUseCase,
    private readonly uploadListingPhoto: UploadListingPhotoUseCase,
    private readonly uploadListingVideo: UploadListingVideoUseCase,
  ) {}

  // ---------- Public dealer catalog (available only) ----------

  @Public()
  @Get('public')
  browse(@Query() dto: PublicListingsDto) {
    return this.listPublicListings.execute(dto);
  }

  @Public()
  @Get('public/:id')
  publicDetail(@Param('id') id: string) {
    return this.getPublicListing.execute(id);
  }

  // ---------- Supplier's own listings ----------

  @Roles(UserRole.SELLER)
  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.listSupplierListings.execute(user.id);
  }

  @Roles(UserRole.SELLER)
  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getListing.execute({ supplierId: user.id, listingId: id });
  }

  // Upload one photo, get back its stored URL. The client uploads photos here
  // first, then sends the returned URLs in create/update.
  @Roles(UserRole.SELLER)
  @Post('photos')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.uploadListingPhoto.execute({
      supplierId: user.id,
      buffer: file?.buffer as Buffer,
      filename: file?.originalname as string,
      mimeType: file?.mimetype as string,
      size: file?.size ?? 0,
    });
  }

  /**
   * One walkaround clip, same contract as photos: upload first, send the URL
   * back in create/update. Its own route because the size and format limits
   * are nothing like a still's.
   */
  @Roles(UserRole.SELLER)
  @Post('videos')
  @UseInterceptors(FileInterceptor('file'))
  uploadVideo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.uploadListingVideo.execute({
      supplierId: user.id,
      buffer: file?.buffer as Buffer,
      filename: file?.originalname as string,
      mimeType: file?.mimetype as string,
      size: file?.size ?? 0,
    });
  }

  @Roles(UserRole.SELLER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    const { publish, ...fields } = dto;
    return this.createListing.execute({
      supplierId: user.id,
      publish,
      ...fields,
    });
  }

  @Roles(UserRole.SELLER)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.updateListing.execute({
      supplierId: user.id,
      listingId: id,
      ...dto,
    });
  }

  /**
   * Send a car for review. Kept at `publish` so the supplier app's existing
   * call site is unchanged, but a supplier can no longer publish anything,
   * this lands the listing at SUBMITTED and an admin decides from there.
   */
  @Roles(UserRole.SELLER)
  @Post(':id/publish')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.submitListing.execute({ supplierId: user.id, listingId: id });
  }

  @Roles(UserRole.SELLER)
  @Post(':id/pause')
  pause(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pauseListing.execute({ supplierId: user.id, listingId: id });
  }

  @Roles(UserRole.SELLER)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deleteListing.execute({ supplierId: user.id, listingId: id });
  }
}
