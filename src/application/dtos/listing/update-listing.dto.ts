import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProposedVehicleDto } from './proposed-vehicle.dto';

/**
 * Edit a listing: the same fields as create, all optional (a patch), minus
 * `publish`: moving a listing live is its own endpoint, not a field edit.
 *
 * Sending a new `vehicleId` re-points the listing at another catalog entry;
 * `seriesId`/`brandId` follow server-side and are not accepted here.
 */
export class UpdateListingDto {
  @IsOptional() @IsMongoId() vehicleId?: string;

  /**
   * The car typed out, for when the catalog has no entry for it. Mutually
   * exclusive with `vehicleId`: sending a real vehicle clears any proposal.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedVehicleDto)
  proposedVehicle?: ProposedVehicleDto;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() vin?: string;

  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() exteriorColor?: string;
  @IsOptional() @IsString() interiorColor?: string;
  @IsOptional() @IsString() drivetrain?: string;

  @IsOptional() @Type(() => Number) @IsNumber() batteryKwh?: number;
  @IsOptional() @Type(() => Number) @IsNumber() rangeKm?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) mileageKm?: number;
  @IsOptional() @IsString() firstRegistered?: string;

  @IsOptional() @Type(() => Number) @IsInt() seats?: number;
  @IsOptional() @Type(() => Number) @IsInt() doors?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
  /** Walkaround clips. Optional; photos are the publishing requirement. */
  @IsOptional() @IsArray() @IsString({ each: true }) videos?: string[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fobPrice?: number;
  @IsOptional() @IsString() province?: string;
}
