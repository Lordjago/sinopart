import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
 * Create a listing. Almost everything is optional so a supplier can save a
 * sparse DRAFT; the full set is only enforced server-side when `publish` is true
 * (see missingForPublish in the domain).
 *
 * The car itself is picked from the catalog as `vehicleId`, make, model, year,
 * variant, fuel and transmission all come from that entry, so they are not
 * fields a supplier types any more. `seriesId`/`brandId` are derived server-
 * side and deliberately absent here.
 */
export class CreateListingDto {
  /** true → attempt to publish (requires a verified store); false → save draft. */
  @IsOptional()
  @IsBoolean()
  publish?: boolean;

  /** The chosen catalog entry. Required to publish, optional for a draft. */
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
