import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DealerIdType,
  DealerKycStatus,
} from '../../../core/domain/entities/dealer-kyc';
import { KycDocumentType } from '../../../core/domain/value-object/kyc';
import { DealerKycDecision } from '../../../core/usecase/dealer-kyc/review-dealer-kyc-document.usecase';

export class DealerAddressDto {
  @IsString() @IsNotEmpty() @MaxLength(200) street: string;
  @IsString() @IsNotEmpty() @MaxLength(80) city: string;
  @IsString() @IsNotEmpty() @MaxLength(80) state: string;
}

/**
 * One wizard step's worth of typed answers. Every field is optional because the
 * wizard saves per step: sending only an address must leave the identity alone.
 * The use case rejects a payload that is empty of everything.
 */
export class SaveDealerKycDetailsDto {
  @IsOptional() @IsEnum(DealerIdType) idType?: DealerIdType;

  // Length is checked in the use case, where "a BVN is 11 digits" belongs;
  // here we only keep something wild from reaching it.
  @IsOptional() @IsString() @MaxLength(20) idNumber?: string;

  @IsOptional() @IsString() @MaxLength(160) businessName?: string;
  @IsOptional() @IsString() @MaxLength(40) rcNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DealerAddressDto)
  address?: DealerAddressDto;
}

export class SaveDealerBankAccountDto {
  @IsString() @IsNotEmpty() @MaxLength(120) holder: string;
  @IsString() @IsNotEmpty() @MaxLength(120) bankName: string;
  @IsString() @IsNotEmpty() @MaxLength(20) accountNumber: string;
}

/** The document `type` travels in the multipart body alongside the file. */
export class UploadDealerKycDocumentDto {
  @IsEnum(KycDocumentType) type: KycDocumentType;
}

export class SubmitDealerKycDto {
  @IsBoolean() termsAccepted: boolean;
}

// ----- back office ---------------------------------------------------------

export class ListDealerKycSubmissionsDto {
  @IsOptional() @IsEnum(DealerKycStatus) status?: DealerKycStatus;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class ReviewDealerKycDocumentDto {
  @IsEnum(KycDocumentType) type: KycDocumentType;
  @IsEnum(DealerKycDecision) decision: DealerKycDecision;

  // Anything other than an approval owes the dealer a reason, and a four-word
  // minimum keeps "no" from counting as one.
  @ValidateIf((o: ReviewDealerKycDocumentDto) => o.decision !== DealerKycDecision.APPROVE)
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  reason?: string;
}

export class DecideDealerKycDto {
  @IsBoolean() approve: boolean;

  @ValidateIf((o: DecideDealerKycDto) => !o.approve)
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  reason?: string;
}