import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Create a brand. `logo` is a URL the admin pastes in, the image is hosted
 * elsewhere, so nothing is uploaded through this API. `require_tld` stays on so
 * a bare hostname or a typo'd path is rejected rather than stored as a dead
 * image src.
 */
export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional() @IsString() @MaxLength(500) description?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  logo?: string;
}
