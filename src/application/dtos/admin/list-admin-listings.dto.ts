import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ListingStatus } from '../../../core/domain/entities/listing';

export class ListAdminListingsDto {
  @IsOptional()
  @IsEnum(ListingStatus, { message: 'Unknown listing status.' })
  status?: ListingStatus;

  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Sending a listing back to the supplier as a draft, with a note explaining why. */
export class ReturnListingDto {
  @IsString()
  @MinLength(4, { message: 'Tell the supplier what to fix.' })
  @MaxLength(500)
  reason: string;
}
