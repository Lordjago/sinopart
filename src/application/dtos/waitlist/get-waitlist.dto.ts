import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';
import { PageDto } from '../page.dto';

/**
 * Query for the waitlist. Every filter is optional, the common call is a bare
 * `GET /waitlist` for the admin panel's table, and each of these only narrows
 * it.
 *
 * Two things this file has to get right, both easy to miss:
 *
 *   1. `@IsOptional()` on the dates. Without it, `@IsDate()` runs against
 *      `undefined` and rejects the unfiltered request with "from must be a
 *      Date instance". A filter nobody asked for failing the whole query.
 *   2. A validation decorator on EVERY property. The global ValidationPipe
 *      runs with `whitelist: true`, which strips any property that carries no
 *      decorator, so an undecorated `email?: string` is not a lenient filter,
 *      it is one that silently never applies.
 */
export class GetWaitListDto extends PageDto {
  @IsOptional() @IsString() email?: string;

  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsString() dealership?: string;

  @IsOptional() @IsString() whatsAppNumber?: string;

  @IsOptional() @Type(() => Date) @IsDate() from?: Date;

  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}
