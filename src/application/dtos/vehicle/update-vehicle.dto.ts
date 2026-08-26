import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Edit a configuration. `seriesId` is absent by design, a vehicle moved to
 * another series is a different car.
 */
export class UpdateVehicleDto {
  @IsOptional() @Type(() => Number) @IsInt() year?: number;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) fuelType?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) transmission?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  variant?: number;
}
