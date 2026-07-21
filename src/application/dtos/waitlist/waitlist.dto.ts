import { IsEmail, IsOptional, IsString } from 'class-validator';

export class WaitListDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  dealership?: string;

  @IsOptional()
  @IsString()
  whatsAppNumber?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
