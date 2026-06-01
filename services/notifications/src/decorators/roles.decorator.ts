import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/role.enum';

/**
 * File: roles.decorator.ts
 * -------------------------
 * Custom decorator that attaches required role metadata to
 * resolver method handlers. Used together with RolesGuard to
 * enforce role-based access control.
 *
 * @param {...Role[]} roles - One or more roles that are permitted.
 * @returns {CustomDecorator} - SetMetadata decorator with the roles array.
 */

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
