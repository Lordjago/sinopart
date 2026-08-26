import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query for the public vehicle list. `brandId` and `seriesId` are both drill-
 * down filters; `seriesId` wins if both are sent, since it is the narrower of
 * the two.
 */
export class ListVehiclesDto {
  @IsOptional() @IsMongoId() brandId?: string;
  @IsOptional() @IsMongoId() seriesId?: string;

  @IsOptional() @Type(() => Number) @IsInt() year?: number;

  @IsOptional() @IsString() @MaxLength(40) fuelType?: string;
  @IsOptional() @IsString() @MaxLength(40) transmission?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
