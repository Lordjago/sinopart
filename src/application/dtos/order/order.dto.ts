import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../../../core/domain/entities/order';

/** Buy the car behind a passed inspection. The price is server-side. */
export class PurchaseListingDto {
  @IsMongoId() inspectionId: string;
}

export class ListOrdersDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

/**
 * The agent's real clearance bill, entered by the back office when an order
 * moves to CLEARING.
 *
 * `total` is sent rather than derived, because the agent's invoice is the
 * authority: if their total does not equal duty + VAT + fees, we want to show
 * what they actually billed, not a number we computed and they will dispute.
 */
export class ClearanceDto {
  @Type(() => Number) @IsInt() @Min(0) duty: number;
  @Type(() => Number) @IsInt() @Min(0) vat: number;
  @Type(() => Number) @IsInt() @Min(0) agentFees: number;
  @Type(() => Number) @IsInt() @Min(0) total: number;
  /** When the port starts charging storage. */
  @IsOptional() @IsDateString() graceDeadline?: string;
}

/** The back office moving a car along. `to` is checked against ORDER_TRANSITIONS. */
export class AdvanceOrderDto {
  @IsEnum(OrderStatus) to: OrderStatus;
  /** Where the car is, in words both parties will read. */
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  /** Vessel or waybill. */
  @IsOptional() @IsString() @MaxLength(120) trackingReference?: string;
  @IsOptional() @IsDateString() etaAt?: string;
  /** Required in practice when moving to CLEARING: without it no clearance
      email can be sent, because there is no figure to quote. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ClearanceDto)
  clearance?: ClearanceDto;
}

/**
 * The dealer's word on delivery. A reason turns it into a dispute; without one
 * it is a confirmation, which releases the holdback.
 */
export class ConfirmDeliveryDto {
  @IsOptional() @IsString() @MaxLength(1000) disputeReason?: string;
}
