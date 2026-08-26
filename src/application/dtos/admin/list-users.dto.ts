import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '../../../core/domain/entities/user';

/**
 * Query for the back-office people directory. Dealers, suppliers, inspectors
 * and admins in one list. `role` narrows to one of the four; leaving it off
 * returns everyone, which is the default the panel opens on.
 */
export class ListUsersDto {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Unknown role.' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /** 'true' / 'false'. Only people whose KYC state matches. */
  @IsOptional()
  @IsBooleanString()
  verified?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Capped: the directory merges two collections in memory, and an unbounded
  // page size would turn one request into a full-table read of both.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
