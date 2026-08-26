import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';

/** Create a series under a brand. The brand must already exist. */
export class CreateSeriesDto {
  @IsMongoId()
  brandId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}
