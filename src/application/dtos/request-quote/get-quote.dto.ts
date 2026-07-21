import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PageDto } from 'src/application/dtos/page.dto';

export class GetQuoteDto extends PageDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @Type(() => Number) @IsInt() year?: number;

  @IsOptional() @IsString() whatsAppNumber?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minBudget?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxBudget?: number;

  @IsOptional() @Type(() => Date) @IsDate() from?: Date;

  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}
