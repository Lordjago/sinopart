/**
 * @Roles(...). Declares which roles may call a route. Read by RolesGuard.
 * A route with no @Roles is unrestricted (any authenticated caller, subject to
 * @Public()). Usage: `@Roles(UserRole.ADMIN)`.
 */
import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../../core/domain/entities/user';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
