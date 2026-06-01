import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/role.enum';

/**
 * Decorator: Roles
 * ----------------
 * Sets the required roles metadata on a resolver method or
 * class. The RolesGuard reads this metadata to enforce auth.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
