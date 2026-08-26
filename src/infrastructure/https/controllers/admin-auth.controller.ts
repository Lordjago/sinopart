/**
 * AdminAuthController: signing into the back office.
 * ---------------------------------------------------------------------------
 *   POST /admin/auth/bootstrap  (public*)  -> create the FIRST admin
 *   POST /admin/auth/login      (public)   -> email + password, staff only
 *   GET  /admin/auth/me         (staff)    -> the signed-in staff profile
 *   POST /admin/auth/logout     (staff)    -> acknowledge; JWTs are stateless
 *   POST /admin/staff           (admin)    -> add an admin or inspector
 *   GET  /admin/staff           (admin)    -> the back-office roster
 *
 * (*) bootstrap is public because there is nobody to authorise it yet, the
 * platform starts with an empty users collection. It guards itself instead:
 * CreateStaffUseCase.bootstrap refuses the moment one admin exists, so the
 * window is exactly "before the first admin" and closes permanently after.
 */
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { AuthenticateAdminUseCase } from '../../../core/usecase/admin/authenticate-admin.usecase';
import { CreateStaffUseCase } from '../../../core/usecase/admin/create-staff.usecase';
import { ListUsersUseCase } from '../../../core/usecase/admin/list-users.usecase';
import { GetProfileUseCase } from '../../../core/usecase/auth/get-profile.usecase';
import { AdminLoginDto } from '../../../application/dtos/admin/admin-login.dto';
import {
  BootstrapAdminDto,
  CreateStaffDto,
} from '../../../application/dtos/admin/create-staff.dto';
import { ListUsersDto } from '../../../application/dtos/admin/list-users.dto';

@Controller('admin')
export class AdminAuthController {
  constructor(
    private readonly authenticateAdmin: AuthenticateAdminUseCase,
    private readonly createStaff: CreateStaffUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getProfile: GetProfileUseCase,
  ) {}

  //Create new staff account (admin or inspector). The first admin is created via bootstrap, which is public but self-guarded.
  @Public()
  @Post('auth/bootstrap')
  bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.createStaff.bootstrap(dto);
  }

  @Public()
  @Post('auth/login')
  login(@Body() dto: AdminLoginDto) {
    return this.authenticateAdmin.execute(dto);
  }

  // Both back-office roles: an inspector needs their own profile to render the
  // panel's header, even though most write routes below are ADMIN-only.
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get('auth/me')
  me(@CurrentUser() user: AuthUser) {
    return this.getProfile.execute(user.id);
  }

  // Nothing to invalidate server-side; the client drops its token. The endpoint
  // exists so the panel's logout has something to call.
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Post('auth/logout')
  logout() {
    return { loggedOut: true };
  }

  @Roles(UserRole.ADMIN)
  @Post('staff')
  addStaff(@Body() dto: CreateStaffDto) {
    return this.createStaff.execute(dto);
  }

  /** The roster. Reuses the people directory, narrowed to one staff role. */
  @Roles(UserRole.ADMIN)
  @Get('staff')
  staff(@Query() dto: ListUsersDto) {
    return this.listUsers.execute({
      ...dto,
      role: dto.role ?? UserRole.ADMIN,
      verified: undefined,
    });
  }
}
