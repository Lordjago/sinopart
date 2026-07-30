import { IsOptional, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^(\+?86)?1[3-9]\d{9}$/, {
    message: 'Enter a valid Chinese mobile number.',
  })
  phone: string;

  @IsOptional()
  @IsString()
  invite?: string;
}
