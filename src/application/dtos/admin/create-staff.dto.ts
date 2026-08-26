import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../../core/domain/entities/user';

/**
 * Create a back-office account. Only ADMIN and INSPECTOR can be minted here,
 * a dealer signs themselves up and a supplier arrives by invitation, so being
 * able to create either from this endpoint would only ever be a mistake.
 */
export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(72) // bcrypt truncates past 72 bytes; reject rather than silently cut
  password: string;

  @IsIn([UserRole.ADMIN, UserRole.INSPECTOR], {
    message: 'Role must be admin or inspector.',
  })
  role: UserRole.ADMIN | UserRole.INSPECTOR;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

/**
 * The first admin, created when the users collection holds none. Same shape
 * minus the role. Bootstrap only ever mints an ADMIN.
 */
export class BootstrapAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(72)
  password: string;
}
