import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SupplierAccountStatus } from '../../../core/domain/entities/supplier';
import { KycDocumentType } from '../../../core/domain/value-object/kyc';

/** What a reviewer can decide about one document. */
export enum KycDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  NEEDS_INFO = 'needs_info',
}

export class ReviewKycDocumentDto {
  @IsEnum(KycDocumentType, { message: 'Unknown document type.' })
  type: KycDocumentType;

  @IsEnum(KycDecision, { message: 'Decision must be approve, reject or needs_info.' })
  decision: KycDecision;

  /**
   * Mandatory for anything that bounces the document back. A rejection with no
   * reason gives the supplier nothing to act on, so the API refuses it rather
   * than letting an empty note reach their resubmit screen.
   */
  @ValidateIf((dto: ReviewKycDocumentDto) => dto.decision !== KycDecision.APPROVE)
  @IsString()
  @MinLength(4, { message: 'Tell the supplier what to fix.' })
  @MaxLength(500)
  reason?: string;
}

export class ListKycSubmissionsDto {
  @IsOptional()
  @IsEnum(SupplierAccountStatus, { message: 'Unknown account status.' })
  status?: SupplierAccountStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Dealers carry no documents yet, so their KYC is a single flag. */
export class SetDealerVerifiedDto {
  @IsBoolean()
  verified: boolean;
}
