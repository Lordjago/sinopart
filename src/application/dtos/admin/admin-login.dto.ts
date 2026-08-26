import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Back-office sign-in. Deliberately its own DTO rather than reusing the dealer
 * LoginDto: the two flows can diverge (2FA, IP allow-listing) without one
 * changing the other, and the shapes only look alike today by coincidence.
 */
export class AdminLoginDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Enter your password.' })
  password: string;
}
