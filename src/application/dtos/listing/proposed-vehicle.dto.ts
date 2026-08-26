import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * A car the supplier is typing because the catalog has no entry for it.
 *
 * Every level is required even when the supplier picked it from the catalog:
 * the names are what the reviewer reads, and re-sending them means the proposal
 * describes a whole car on its own rather than half a car plus two ids. Where a
 * level WAS picked, its id comes along so the admin can add only what is new.
 */
export class ProposedVehicleDto {
  @IsString() @MaxLength(80) brand: string;
  /** Set when the brand was picked from the catalog rather than typed. */
  @IsOptional() @IsMongoId() brandId?: string;

  @IsString() @MaxLength(80) series: string;
  @IsOptional() @IsMongoId() seriesId?: string;

  // Bounds match the vehicle catalog's own, so a proposal cannot describe a
  // configuration the catalog would refuse once an admin tries to add it.
  @Type(() => Number) @IsInt() @Min(1980) @Max(2100) year: number;
  @Type(() => Number) @IsNumber() @Min(0) variant: number;

  @IsString() @MaxLength(40) fuelType: string;
  @IsString() @MaxLength(40) transmission: string;

  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
