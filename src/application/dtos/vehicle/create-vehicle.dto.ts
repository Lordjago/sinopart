import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Create one configuration under a series. Every field here is part of the
 * vehicle's natural key, so all of them are required, a half-specified
 * configuration is not a car.
 *
 * The year RANGE is checked in the domain, not here: "is this a plausible model
 * year" depends on today's date, which is a business rule rather than a shape.
 */
export class CreateVehicleDto {
  @IsMongoId()
  seriesId: string;

  @Type(() => Number)
  @IsInt()
  year: number;

  @IsString() @MinLength(1) @MaxLength(40) fuelType: string;
  @IsString() @MinLength(1) @MaxLength(40) transmission: string;

  /** Engine/trim variant, e.g. 2.5 for a Camry 2.5. */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  variant: number;
}
