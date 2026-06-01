import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/auth-client';

/**
 * Decorator: @Roles
 * -----------------
 * Sets the required roles metadata on a resolver method.
 * Used together with RolesGuard to enforce role-based access control.
 *
 * @param {...Role[]} roles - One or more roles allowed to access the resource.
 * @returns {CustomDecorator} - SetMetadata decorator with 'roles' key.
 */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
