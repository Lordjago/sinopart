/**
 * Platform configuration.
 *
 *   GET   /admin/config       (staff) -> every setting, with metadata
 *   PATCH /admin/config/:key  (admin) -> change one
 *   GET   /config/public      (public) -> the handful a dealer app may read
 *
 * Admin-only throughout, matching the panel: the nav item and the route guard
 * both hide it from inspectors, so allowing them to read it here would be a
 * permission nothing can exercise.
 */
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import {
  GetPublicConfigUseCase,
  ListSettingsUseCase,
  UpdateSettingUseCase,
} from '../../../core/usecase/config/config.usecases';
import { UpdateSettingDto } from '../../../application/dtos/config/update-setting.dto';

@Controller()
export class ConfigController {
  constructor(
    private readonly listSettings: ListSettingsUseCase,
    private readonly updateSetting: UpdateSettingUseCase,
    private readonly publicConfig: GetPublicConfigUseCase,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get('admin/config')
  list() {
    return this.listSettings.execute();
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/config/:key')
  update(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.updateSetting.execute({
      key,
      value: dto.value,
      adminId: user.id,
    });
  }

  /** What the dealer app quotes before anyone has signed in. */
  @Public()
  @Get('config/public')
  forDealers() {
    return this.publicConfig.execute();
  }
}
