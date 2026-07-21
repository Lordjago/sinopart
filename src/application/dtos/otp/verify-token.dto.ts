import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { CodeTokenDto } from './code-token.dto';

export class VerifyTokenDto extends CodeTokenDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP code must be 6 characters long.' })
  @Matches(/^\d{6}$/, { message: 'OTP code must be 6 digits.' })
  code: string;
}
