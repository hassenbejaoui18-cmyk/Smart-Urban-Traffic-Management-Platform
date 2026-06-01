import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Guard: RolesGuard
 * -----------------
 * Reads the required roles from the @Roles decorator metadata and
 * compares them against the role in the JWT payload. Grants access
 * if no roles are required or the user's role is in the allowed set.
 */
export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const ctx = GqlExecutionContext.create(context);
    const { role } = ctx.getContext().req.user;
    return requiredRoles.includes(role);
  }
}
