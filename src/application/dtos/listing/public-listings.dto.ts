import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Query for the public dealer catalog. Status is forced to available
 * server-side. Make/model are now catalog ids rather than free text, the
 * client filters with what the brand/series pickers already hold.
 */
export class PublicListingsDto {
  @IsOptional() @IsMongoId() brandId?: string;
  @IsOptional() @IsMongoId() seriesId?: string;
  @IsOptional() @IsMongoId() vehicleId?: string;

  /** One store's live inventory: what a public storefront page renders. */
  @IsOptional() @IsMongoId() supplierId?: string;

  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() province?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
