import { IsString, MaxLength } from 'class-validator';

/**
 * Every value arrives as a string and is coerced against its definition's
 * declared type. One shape for numbers, rates and flags alike, which is what
 * keeps adding a new setting to a single registry entry.
 */
export class UpdateSettingDto {
  @IsString() @MaxLength(500) value: string;
}
