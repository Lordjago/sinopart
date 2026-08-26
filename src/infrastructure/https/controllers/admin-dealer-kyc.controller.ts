/**
 * AdminDealerKycController: the verification desk, dealer side.
 * ---------------------------------------------------------------------------
 *   GET  /admin/kyc/dealers                 -> the queue
 *   GET  /admin/kyc/dealers/:userId         -> one dealer's file
 *   POST /admin/kyc/dealers/:userId/review  -> decide ONE document
 *   POST /admin/kyc/dealers/:userId/decide  -> decide the WHOLE application
 *
 * A sibling of AdminKycController rather than routes bolted onto it: the two
 * queues are over different collections and different required documents, and
 * a shared controller would spend every method branching on which side it was
 * serving. The views they return are the same shape on purpose, so the admin
 * panel's review desk renders either.
 *
 * Registered BEFORE AdminKycController in https.module, because `dealers` would
 * otherwise be swallowed by that controller's `submissions/:supplierId`-style
 * patterns if the prefixes ever converge.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { ListDealerKycSubmissionsUseCase } from '../../../core/usecase/dealer-kyc/list-dealer-kyc-submissions.usecase';
import { GetDealerKycSubmissionUseCase } from '../../../core/usecase/dealer-kyc/get-dealer-kyc-submission.usecase';
import { ReviewDealerKycDocumentUseCase } from '../../../core/usecase/dealer-kyc/review-dealer-kyc-document.usecase';
import { DecideDealerKycUseCase } from '../../../core/usecase/dealer-kyc/decide-dealer-kyc.usecase';
import {
  DecideDealerKycDto,
  ListDealerKycSubmissionsDto,
  ReviewDealerKycDocumentDto,
} from '../../../application/dtos/dealer-kyc/dealer-kyc.dto';

@Controller('admin/kyc/dealers')
export class AdminDealerKycController {
  constructor(
    private readonly listSubmissions: ListDealerKycSubmissionsUseCase,
    private readonly getSubmission: GetDealerKycSubmissionUseCase,
    private readonly reviewDocument: ReviewDealerKycDocumentUseCase,
    private readonly decide: DecideDealerKycUseCase,
  ) {}

  /**
   * `submittedOnly` is forced: a half-finished draft is not a submission and
   * has nothing for a reviewer to act on, so the queue never shows one.
   */
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get()
  queue(@Query() dto: ListDealerKycSubmissionsDto) {
    return this.listSubmissions.execute({ ...dto, submittedOnly: true });
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get(':userId')
  submission(@Param('userId') userId: string) {
    return this.getSubmission.execute(userId);
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Post(':userId/review')
  review(
    @CurrentUser() reviewer: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: ReviewDealerKycDocumentDto,
  ) {
    return this.reviewDocument.execute({
      userId,
      type: dto.type,
      decision: dto.decision,
      reason: dto.reason,
      reviewerId: reviewer.id,
    });
  }

  /** Approving or refusing the application as a whole. ADMIN only: a
   *  per-document bounce is routine, a blanket refusal is not. */
  @Roles(UserRole.ADMIN)
  @Post(':userId/decide')
  decision(
    @CurrentUser() reviewer: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: DecideDealerKycDto,
  ) {
    return this.decide.execute({
      userId,
      approve: dto.approve,
      reason: dto.reason,
      reviewerId: reviewer.id,
    });
  }
}
