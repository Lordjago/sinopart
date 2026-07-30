import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Query for the public dealer catalog. Status is forced to available server-side. */
export class PublicListingsDto {
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() fuel?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() province?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
