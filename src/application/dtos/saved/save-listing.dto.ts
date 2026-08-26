import { IsMongoId } from 'class-validator';

/** Save one car. Who is saving comes from the token, never the body. */
export class SaveListingDto {
  @IsMongoId() listingId: string;
}
