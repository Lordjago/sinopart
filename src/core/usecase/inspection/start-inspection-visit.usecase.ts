/**
 * StartInspectionVisitUseCase: the inspector is at the yard.
 * (POST /admin/inspections/:id/start)
 * ---------------------------------------------------------------------------
 * A small step, but the buyer's tracking screen is mostly waiting, and "your
 * inspector is at the yard" is the one update that turns a silent wait into a
 * visible one. It also records who attended, so a report can be traced back to
 * a person.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { INSPECTION_REPOSITORY } from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import {
  InspectionStatus,
  type Inspection,
} from '../../domain/entities/inspection';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

export interface StartInspectionVisitInput {
  inspectionId: string;
  inspectorId: string;
}

@Injectable()
export class StartInspectionVisitUseCase extends BaseUseCase<
  StartInspectionVisitInput,
  Inspection
> {
  constructor(
    @Inject(INSPECTION_REPOSITORY)
    private readonly inspections: InspectionRepository,
  ) {
    super();
  }

  async execute({
    inspectionId,
    inspectorId,
  }: StartInspectionVisitInput): Promise<Inspection> {
    const inspection = await this.inspections.findById(inspectionId);
    if (!inspection) throw new ResourceNotFoundError('Inspection not found.');
    if (inspection.status !== InspectionStatus.ACCEPTED) {
      throw new ValidationError(
        'Only an accepted inspection can be started.',
      );
    }

    return this.inspections.update(inspectionId, {
      status: InspectionStatus.IN_PROGRESS,
      inspectorId,
      scheduledAt: inspection.scheduledAt ?? new Date(),
    });
  }
}
