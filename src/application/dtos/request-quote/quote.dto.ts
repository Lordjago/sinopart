import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class QuoteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  year: number;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message:
      'Invalid WhatsApp number format. It should start with a country code followed by 9 to 10 digits.',
  })
  whatsAppNumber: string;
}
