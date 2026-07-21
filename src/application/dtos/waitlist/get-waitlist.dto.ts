import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import { PageDto } from '../page.dto';

export class GetWaitListDto extends PageDto {
  email?: string;
  name?: string;
  dealership?: string;
  whatsAppNumber?: string;
  @Type(() => Date) @IsDate() from?: Date;
  @Type(() => Date) @IsDate() to?: Date;
}
