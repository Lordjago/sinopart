/**
 * AdminController: the back office's read/manage surface.
 * ---------------------------------------------------------------------------
 *   GET  /admin/dashboard                   (staff) -> headline counts + queue
 *   GET  /admin/users                       (staff) -> the four-role directory
 *   GET  /admin/users/:source/:id           (staff) -> one account in full
 *   POST /admin/users/:userId/verification  (admin) -> flip a dealer's KYC flag
 *
 *   GET  /admin/invitations                  (staff) -> every invite + its state
 *   POST /admin/invitations                  (admin) -> mint one, issued by ME
 *   POST /admin/invitations/:code/revoke     (admin) -> kill an unused invite
 *
 * Reads are open to both back-office roles so an inspector can navigate; the
 * actions that change who can join the platform are ADMIN-only.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { GetDashboardUseCase } from '../../../core/usecase/admin/get-dashboard.usecase';
import { ListUsersUseCase } from '../../../core/usecase/admin/list-users.usecase';
import {
  GetUserUseCase,
  type UserSource,
} from '../../../core/usecase/admin/get-user.usecase';
import { SetDealerVerifiedUseCase } from '../../../core/usecase/admin/set-dealer-verified.usecase';
import { ListInvitationsUseCase } from '../../../core/usecase/admin/list-invitations.usecase';
import { RevokeInvitationUseCase } from '../../../core/usecase/admin/revoke-invitation.usecase';
import { IssueInvitationUseCase } from '../../../core/usecase/supplier-auth/issue-invitation.usecase';
import { ListUsersDto } from '../../../application/dtos/admin/list-users.dto';
import { ListInvitationsDto } from '../../../application/dtos/admin/list-invitations.dto';
import { SetDealerVerifiedDto } from '../../../application/dtos/admin/review-kyc.dto';
import { CreateInvitationDto } from '../../../application/dtos/supplier/create-invitation.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: GetDashboardUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly setDealerVerified: SetDealerVerifiedUseCase,
    private readonly listInvitations: ListInvitationsUseCase,
    private readonly issueInvitation: IssueInvitationUseCase,
    private readonly revokeInvitation: RevokeInvitationUseCase,
  ) {}

  // ---------- Overview ----------

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('dashboard')
  overview() {
    return this.dashboard.execute();
  }

  // ---------- Users ----------

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('users')
  users(@Query() dto: ListUsersDto) {
    return this.listUsers.execute({
      role: dto.role,
      search: dto.search,
      // Query strings have no booleans; the DTO validates 'true'/'false' and
      // the conversion happens here so the use case takes a real boolean.
      verified: dto.verified == null ? undefined : dto.verified === 'true',
      page: dto.page,
      limit: dto.limit,
    });
  }

  /**
   * One account in full. `source` says which collection to read, a supplier id
   * and a user id are unrelated id spaces, so it cannot be inferred, and every
   * directory row already carries it.
   */
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('users/:source/:id')
  user(@Param('source') source: UserSource, @Param('id') id: string) {
    return this.getUser.execute({ source, id });
  }

  @Roles(UserRole.ADMIN)
  @Post('users/:userId/verification')
  verifyDealer(
    @Param('userId') userId: string,
    @Body() dto: SetDealerVerifiedDto,
  ) {
    return this.setDealerVerified.execute({ userId, verified: dto.verified });
  }

  // ---------- Invitations ----------

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('invitations')
  invitations(@Query() dto: ListInvitationsDto) {
    return this.listInvitations.execute(dto);
  }

  /**
   * Mint an invite. `issuedBy` comes from the verified token, never the body,
   * the audit trail is only worth keeping if the caller cannot choose what it
   * says about them.
   */
  @Roles(UserRole.ADMIN)
  @Post('invitations')
  createInvitation(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.issueInvitation.execute({
      storeName: dto.storeName,
      expiresInDays: dto.expiresInDays,
      issuedBy: admin.id,
    });
  }

  @Roles(UserRole.ADMIN)
  @Post('invitations/:code/revoke')
  revoke(@Param('code') code: string) {
    return this.revokeInvitation.execute(code);
  }
}
