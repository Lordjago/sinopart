import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { CodeTokenDto } from '../otp/code-token.dto';

export class ResetPasswordDto extends CodeTokenDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;
}
