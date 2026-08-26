import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Rename a series. `brandId` is absent by design, re-parenting a series would
 * move every vehicle under it to another manufacturer.
 */
export class UpdateSeriesDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
}
