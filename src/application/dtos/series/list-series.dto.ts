import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

/** Query for the public series list. Both filters are optional. */
export class ListSeriesDto {
  @IsOptional() @IsMongoId() brandId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
}
