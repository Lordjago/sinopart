import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Create a listing. Almost everything is optional so a supplier can save a
 * sparse DRAFT; the full set is only enforced server-side when `publish` is true
 * (see missingForPublish in the domain).
 */
export class CreateListingDto {
  /** true → attempt to publish (requires a verified store); false → save draft. */
  @IsOptional()
  @IsBoolean()
  publish?: boolean;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;

  @IsOptional() @Type(() => Number) @IsInt() year?: number;

  @IsOptional() @IsString() trim?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() exteriorColor?: string;
  @IsOptional() @IsString() interiorColor?: string;
  @IsOptional() @IsString() fuel?: string;
  @IsOptional() @IsString() drivetrain?: string;

  @IsOptional() @Type(() => Number) @IsNumber() batteryKwh?: number;
  @IsOptional() @Type(() => Number) @IsNumber() rangeKm?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) mileageKm?: number;
  @IsOptional() @IsString() firstRegistered?: string;

  @IsOptional() @Type(() => Number) @IsInt() seats?: number;
  @IsOptional() @Type(() => Number) @IsInt() doors?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fobPrice?: number;
  @IsOptional() @IsString() province?: string;
}
