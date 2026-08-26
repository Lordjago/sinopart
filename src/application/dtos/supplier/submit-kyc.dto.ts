import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * The store's registered office. Everything except the postal code is required:
 * a reviewer reads this against the uploaded business licence, and a
 * half-filled address is worse than none because it looks answered.
 */
export class OfficeAddressDto {
  @IsString() @IsNotEmpty() @MaxLength(200) street: string;
  @IsString() @IsNotEmpty() @MaxLength(80) city: string;
  @IsString() @IsNotEmpty() @MaxLength(80) province: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) country: string;
}

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  bankHolder: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @Matches(/^\d[\d\s-]{5,}$/, {
    message: 'Enter a valid account number (at least 6 digits).',
  })
  accountNumber: string;

  @ValidateNested()
  @Type(() => OfficeAddressDto)
  officeAddress: OfficeAddressDto;

  @IsBoolean()
  termsAccepted: boolean;
}
