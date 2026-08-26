/**
 * The back office's side of an inspection.
 *
 *   GET  /admin/inspections            (staff) -> the queue, any status
 *   GET  /admin/inspections/:id        (staff) -> one, with both parties' contacts
 *   POST /admin/inspections/:id/start  (staff) -> the inspector is at the yard
 *   POST /admin/inspections/:id/report (staff) -> file the findings
 *
 * Inspectors can do all of it: attending yards and writing reports is the job.
 * Nothing here is admin-only, unlike listings, where publishing is a commercial
 * decision rather than a field visit.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { ListInspectionsUseCase } from '../../../core/usecase/inspection/list-inspections.usecase';
import { GetInspectionUseCase } from '../../../core/usecase/inspection/get-inspection.usecase';
import { StartInspectionVisitUseCase } from '../../../core/usecase/inspection/start-inspection-visit.usecase';
import { SubmitInspectionReportUseCase } from '../../../core/usecase/inspection/submit-inspection-report.usecase';
import { UploadInspectionEvidenceUseCase } from '../../../core/usecase/inspection/upload-evidence.usecase';
import {
  ListInspectionsDto,
  SubmitInspectionReportDto,
} from '../../../application/dtos/inspection/inspection.dto';

@Controller('admin/inspections')
export class AdminInspectionController {
  constructor(
    private readonly listInspections: ListInspectionsUseCase,
    private readonly getInspection: GetInspectionUseCase,
    private readonly startVisit: StartInspectionVisitUseCase,
    private readonly submitReport: SubmitInspectionReportUseCase,
    private readonly uploadEvidence_: UploadInspectionEvidenceUseCase,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get()
  list(@Query() dto: ListInspectionsDto) {
    // The queue is where an inspector picks up work, so it carries both the
    // contacts and the yard address: deciding what to attend and knowing where
    // it is should not take a second call per row.
    return this.listInspections.execute({
      ...dto,
      includeContact: true,
      includeAddress: true,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getInspection.execute({ inspectionId: id, as: 'admin' });
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.startVisit.execute({ inspectionId: id, inspectorId: user.id });
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Post(':id/report')
  report(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitInspectionReportDto,
  ) {
    return this.submitReport.execute({
      inspectionId: id,
      outcome: dto.outcome,
      grade: dto.grade,
      headline: dto.headline ?? null,
      summary: dto.summary,
      vinVerified: dto.vinVerified,
      odometerVerified: dto.odometerVerified,
      mileageKm: dto.mileageKm ?? null,
      batteryHealthPct: dto.batteryHealthPct ?? null,
      batteryCycles: dto.batteryCycles ?? null,
      rangeTestKm: dto.rangeTestKm ?? null,
      history: dto.history ?? null,
      evidence: dto.evidence ?? [],
      sections: dto.sections.map((s) => ({
        key: s.key,
        label: s.label,
        state: s.state,
        note: s.note ?? null,
        group: s.group ?? null,
      })),
      photos: dto.photos ?? [],
      inspectorName: dto.inspectorName,
      inspectorCode: dto.inspectorCode ?? null,
      inspectedAt: dto.inspectedAt ?? null,
      inspectorId: user.id,
    });
  }
  /**
   * One evidence file. Uploaded from the yard, one named shot at a time, and
   * the returned URLs travel with the report.
   */
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Post(':id/evidence')
  @UseInterceptors(FileInterceptor('file'))
  uploadEvidence(
    @Param('id') id: string,
    @UploadedFile()
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.uploadEvidence_.execute({
      inspectionId: id,
      buffer: file?.buffer as Buffer,
      filename: file?.originalname as string,
      mimeType: file?.mimetype as string,
      size: file?.size ?? 0,
    });
  }

}
