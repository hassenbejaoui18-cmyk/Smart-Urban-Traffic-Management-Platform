import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/role.enum';

/**
 * Decorator: Roles
 * ----------------
 * Sets the required roles metadata on a resolver method or
 * class. The RolesGuard reads this metadata to enforce auth.
 */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
