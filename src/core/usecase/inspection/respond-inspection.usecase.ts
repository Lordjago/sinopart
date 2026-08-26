/**
 * RespondInspectionUseCase: the store answers "can our inspector visit?"
 * (POST /inspections/:id/accept | /decline)
 * ---------------------------------------------------------------------------
 * A real person is being sent to a physical yard, so the store has to agree
 * before anyone travels. Accepting moves the inspection to ACCEPTED and leaves
 * the car reserved. Declining releases the car back to AVAILABLE: the buyer is
 * not left holding a reservation the store will not honour, and the car is not
 * left frozen off the market.
 *
 * The declining store owes a reason. It is the only thing the buyer will see
 * to explain why their paid inspection went nowhere.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
} from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import {
  AWAITING_SUPPLIER,
  InspectionStatus,
  type Inspection,
} from '../../domain/entities/inspection';
import { ListingStatus } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ValidationError } from '../../errors/validation.error';

export interface RespondInspectionInput {
  supplierId: string;
  inspectionId: string;
  accept: boolean;
  note?: string;
}

@Injectable()
export class RespondInspectionUseCase extends BaseUseCase<
  RespondInspectionInput,
  Inspection
> {
  constructor(
    @Inject(INSPECTION_REPOSITORY)
    private readonly inspections: InspectionRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {
    super();
  }

  async execute(input: RespondInspectionInput): Promise<Inspection> {
    const inspection = await this.inspections.findById(input.inspectionId);
    if (!inspection) throw new ResourceNotFoundError('Inspection not found.');
    if (inspection.supplierId !== input.supplierId) {
      throw new ForbiddenError('This inspection belongs to another store.');
    }
    if (!AWAITING_SUPPLIER.has(inspection.status)) {
      throw new ValidationError(
        'This inspection has already been answered.',
      );
    }
    if (!input.accept && !input.note?.trim()) {
      throw new ValidationError(
        'Tell the buyer why you cannot take the inspection.',
      );
    }

    const updated = await this.inspections.update(input.inspectionId, {
      status: input.accept
        ? InspectionStatus.ACCEPTED
        : InspectionStatus.DECLINED,
      respondedAt: new Date(),
      supplierNote: input.note?.trim() || null,
    });

    // A refused visit puts the car back on the market: nobody is holding it.
    if (!input.accept) {
      await this.listings.setStatus(
        inspection.listingId,
        ListingStatus.AVAILABLE,
      );
    }

    return updated;
  }
}
