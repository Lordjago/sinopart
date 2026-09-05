/**
 * StartInspectionVisitUseCase: the inspector is at the yard.
 * (POST /admin/inspections/:id/start)
 * ---------------------------------------------------------------------------
 * A small step, but the buyer's tracking screen is mostly waiting, and "your
 * inspector is at the yard" is the one update that turns a silent wait into a
 * visible one. It also records who attended, so a report can be traced back to
 * a person.
 */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  INSPECTION_REPOSITORY,
  LISTING_REPOSITORY,
  MAIL_SERVICE,
  USER_REPOSITORY,
} from '../../injection.token';
import type { InspectionRepository } from '../../interfaces/repository/inspection.repository';
import type { ListingRepository } from '../../interfaces/repository/listing.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import type { MailService } from '../../interfaces/services/mail.service';
import { inspectionVisitTemplate } from '../../mail/inspection.template';
import { inspectionMailFacts } from './inspection-mail';
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
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(MAIL_SERVICE)
    private readonly mail: MailService,
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
      throw new ValidationError('Only an accepted inspection can be started.');
    }

    const updated = await this.inspections.update(inspectionId, {
      status: InspectionStatus.IN_PROGRESS,
      inspectorId,
      scheduledAt: inspection.scheduledAt ?? new Date(),
    });

    /* This is the update that turns a silent wait into a visible one, which is
       the whole point of the step. Not awaited: the inspector is standing in a
       yard tapping a button and should not wait on our mail transport. */
    this.notifyBuyer(updated);

    return updated;
  }

  private async notifyBuyer(inspection: Inspection): Promise<void> {
    const facts = await inspectionMailFacts(
      { users: this.users, listings: this.listings },
      inspection,
    );
    if (!facts) return;

    await this.mail.send(inspectionVisitTemplate(facts));
  }
}
