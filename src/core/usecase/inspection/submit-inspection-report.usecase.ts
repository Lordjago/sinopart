/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * SubmitInspectionReportUseCase: the back office files the inspector's findings.
 * (POST /admin/inspections/:id/report)
 * ---------------------------------------------------------------------------
 * The report IS the product the buyer paid for, and its `outcome` is the only
 * field with lifecycle meaning:
 *
 *   pass -> inspection PASSED, car stays RESERVED while the buyer decides
 *   fail -> inspection FAILED, car moves to FAILED and off the market
 *
 * A failed car is not returned to AVAILABLE. It failed a physical inspection,
 * so putting it straight back in front of the next dealer would be selling a
 * car we have already been told is bad. The store deals with it and relists.
 *
 * Section notes are kept whatever the section's state. A note on a PASSED
 * section is an advisory — "the paint is sound but it is not the factory's" —
 * and dropping it because the row was green would hide from the dealer the one
 * thing they could not have seen from the photos.
 */
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
import {
  inspectionFailedTemplate,
  inspectionPassedTemplate,
} from '../../mail/inspection.template';
import { inspectionMailFacts } from './inspection-mail';
import {
  REPORTABLE_STATUSES,
  InspectionStatus,
  normalizeSectionNote,
  type Inspection,
  type InspectionReport,
} from '../../domain/entities/inspection';
import { ListingStatus } from '../../domain/entities/listing';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

export interface SubmitInspectionReportInput extends Omit<
  InspectionReport,
  'submittedAt'
> {
  inspectionId: string;
}

@Injectable()
export class SubmitInspectionReportUseCase extends BaseUseCase<
  SubmitInspectionReportInput,
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

  async execute(input: SubmitInspectionReportInput): Promise<Inspection> {
    const { inspectionId, ...report } = input;

    const inspection = await this.inspections.findById(inspectionId);
    if (!inspection) throw new ResourceNotFoundError('Inspection not found.');

    if (!REPORTABLE_STATUSES.has(inspection.status)) {
      throw new ValidationError(
        inspection.status === InspectionStatus.PAID
          ? 'The store has not accepted this inspection yet.'
          : 'This inspection already has a report.',
      );
    }

    const passed = report.outcome === 'pass';
    /* Trimmed here rather than trusted from the client, so a stray space never
       becomes an empty advisory on the dealer's report. */
    const sections = (report.sections ?? []).map((section) => ({
      ...section,
      note: normalizeSectionNote(section.note),
    }));

    const updated = await this.inspections.update(inspectionId, {
      status: passed ? InspectionStatus.PASSED : InspectionStatus.FAILED,
      report: {
        ...report,
        sections,
        submittedAt: new Date(),
      },
    });

    if (!passed) {
      await this.listings.setStatus(inspection.listingId, ListingStatus.FAILED);
    }

    /* The outcome the dealer paid to find out. Not awaited: the inspector is
       filing a report and must not be blocked by, or fail on, mail. */
    this.notifyBuyer(updated, passed);

    return updated;
  }

  private async notifyBuyer(
    inspection: Inspection,
    passed: boolean,
  ): Promise<void> {
    const facts = await inspectionMailFacts(
      { users: this.users, listings: this.listings },
      inspection,
    );
    if (!facts) return;

    await this.mail.send(
      passed
        ? inspectionPassedTemplate({
            ...facts,
            fee: inspection.fee,
            /* The hold IS the decision window: when it lapses the car goes
               back on the market, whatever the dealer intended. */
            decideBy: inspection.reservedUntil,
          })
        : inspectionFailedTemplate({ ...facts, fee: inspection.fee }),
    );
  }
}
