import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '@prisma/client';

/**
 * Guard: RolesGuard
 * -----------------
 * Checks the authenticated user's role against the roles required
 * by the @Roles() decorator on the resolver. Returns true if the
 * user's role is in the required set, false otherwise.
 *
 * Apply with @UseGuards(JwtAuthGuard, RolesGuard) + @Roles('ADMIN').
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines whether the current user has one of the required roles.
   *
   * @param {ExecutionContext} context - NestJS execution context.
   * @returns {boolean} - True if authorized, false otherwise.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const ctx: GqlExecutionContext = GqlExecutionContext.create(context);
    const { user } = ctx.getContext<{ req: { user: { role: Role } } }>().req;
    return requiredRoles.includes(user.role);
  }
}
