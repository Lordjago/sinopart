/**
 * AdminKycController: the verification desk.
 * ---------------------------------------------------------------------------
 *   GET  /admin/kyc/submissions               -> the queue
 *   GET  /admin/kyc/submissions/:supplierId   -> one store, all four items
 *   POST /admin/kyc/submissions/:supplierId/review -> decide ONE document
 *
 * Open to ADMIN and INSPECTOR alike: reviewing KYC is precisely what an
 * inspector account exists for.
 *
 * Reviews are per document, not per store, which is what lets two people work
 * the same submission at once (one takes the licence, another the identity)
 * without either overwriting the other (see reviewKycDocument's positional
 * update). Approving the last outstanding document verifies the store on its
 * own; nobody has to remember to flip a status afterwards.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { ListKycSubmissionsUseCase } from '../../../core/usecase/admin/list-kyc-submissions.usecase';
import { GetKycSubmissionUseCase } from '../../../core/usecase/admin/get-kyc-submission.usecase';
import { ReviewKycDocumentUseCase } from '../../../core/usecase/admin/review-kyc-document.usecase';
import {
  ListKycSubmissionsDto,
  ReviewKycDocumentDto,
} from '../../../application/dtos/admin/review-kyc.dto';

@Controller('admin/kyc')
export class AdminKycController {
  constructor(
    private readonly listSubmissions: ListKycSubmissionsUseCase,
    private readonly getSubmission: GetKycSubmissionUseCase,
    private readonly reviewDocument: ReviewKycDocumentUseCase,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('submissions')
  queue(@Query() dto: ListKycSubmissionsDto) {
    return this.listSubmissions.execute(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('submissions/:supplierId')
  submission(@Param('supplierId') supplierId: string) {
    return this.getSubmission.execute(supplierId);
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Post('submissions/:supplierId/review')
  review(
    @CurrentUser() reviewer: AuthUser,
    @Param('supplierId') supplierId: string,
    @Body() dto: ReviewKycDocumentDto,
  ) {
    return this.reviewDocument.execute({
      supplierId,
      type: dto.type,
      decision: dto.decision,
      reason: dto.reason,
      reviewerId: reviewer.id,
    });
  }
}
