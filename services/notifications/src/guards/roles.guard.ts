import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '../common/role.enum';

/**
 * File: roles.guard.ts
 * ---------------------
 * Guard that enforces role-based access control by reading the
 * required roles from a @Roles() decorator metadata and comparing
 * them against the authenticated user's role (from the JWT payload).
 *
 * @returns {boolean} - true if the user's role is in the required set,
 *   or if no roles are required. false otherwise (throws ForbiddenException).
 */

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const ctx = GqlExecutionContext.create(context);
    const { role } = ctx.getContext().req.user;
    return requiredRoles.includes(role);
  }
}
