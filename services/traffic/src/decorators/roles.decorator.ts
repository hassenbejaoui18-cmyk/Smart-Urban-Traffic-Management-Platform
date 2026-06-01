/**
 * File: roles.decorator.ts
 * -------------------------
 * Decorator that attaches allowed roles metadata to resolver handlers.
 * Consumed by RolesGuard to authorize requests.
 *
 * @returns {Roles}
 */
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
