import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Query for the public brand list. `search` is a substring type-ahead filter. */
export class ListBrandsDto {
  @IsOptional() @IsString() @MaxLength(80) search?: string;
}
