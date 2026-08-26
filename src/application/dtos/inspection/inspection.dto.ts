import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  InspectionStatus,
  SECTION_STATES,
  type SectionState,
} from '../../../core/domain/entities/inspection';

/** Pay to inspect one car. The fee is server-side; a client cannot name a price. */
export class StartInspectionDto {
  @IsMongoId() listingId: string;
}

/** The store's answer to a yard visit. A refusal owes the buyer a reason. */
export class RespondInspectionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class ListInspectionsDto {
  @IsOptional() @IsEnum(InspectionStatus) status?: InspectionStatus;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class InspectionSectionDto {
  @IsString() @MaxLength(60) key: string;
  @IsString() @MaxLength(120) label: string;
  /** Drives the colour of the row on the buyer's report. */
  @IsIn(SECTION_STATES as unknown as string[]) state: SectionState;
  /**
   * Accepted on any state, passes included: an area can be sound and still
   * carry something the dealer must know (paint that is not the factory's own,
   * a replaced part that works). Those become advisories on the buyer's report.
   */
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  /** Which heading this row prints under on the report sheet. */
  @IsOptional() @IsString() @MaxLength(60) group?: string;
}
/** What the records provider says, as against what the inspector saw. */
export class InspectionHistoryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) accidentRecords?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) insuranceClaims?: number;
  @IsOptional() @IsString() @MaxLength(200) claimNote?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maintenanceRecords?: number;
  @IsOptional() @IsBoolean() odometerIntegrity?: boolean;
  @IsOptional() @IsString() @MaxLength(80) source?: string;
}

/**
 * One labelled photo or clip. The label is what the report sheet prints beside
 * it, so an odometer shot reads as the odometer rather than as photo four.
 */
export class InspectionEvidenceDto {
  @IsString() @MaxLength(500) url: string;
  @IsString() @MaxLength(80) label: string;
  @IsIn(['photo', 'video']) kind: 'photo' | 'video';
}


/**
 * The inspector's findings.
 *
 * `outcome` is the only field the domain acts on: it decides whether the
 * inspection lands at PASSED or FAILED, and whether the car goes back off the
 * market. Everything else is what the buyer reads.
 */
export class SubmitInspectionReportDto {
  @IsIn(['pass', 'fail']) outcome: 'pass' | 'fail';

  @IsString() @MaxLength(10) grade: string;
  /** The one-line verdict printed above the detail. */
  @IsOptional() @IsString() @MaxLength(200) headline?: string;
  @IsString() @MaxLength(4000) summary: string;

  @IsBoolean() vinVerified: boolean;
  @IsBoolean() odometerVerified: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) mileageKm?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryHealthPct?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) batteryCycles?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) rangeTestKm?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => InspectionHistoryDto)
  history?: InspectionHistoryDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionEvidenceDto)
  evidence?: InspectionEvidenceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionSectionDto)
  sections: InspectionSectionDto[];

  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];

  @IsString() @MaxLength(120) inspectorName: string;
  @IsOptional() @IsString() @MaxLength(40) inspectorCode?: string;
  /** Where the inspection happened, for the sheet signature line. */
  @IsOptional() @IsString() @MaxLength(120) inspectedAt?: string;
}
