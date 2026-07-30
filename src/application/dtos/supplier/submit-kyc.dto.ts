import { IsBoolean, IsNotEmpty, IsString, Matches } from 'class-validator';

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

  @IsBoolean()
  termsAccepted: boolean;
}
