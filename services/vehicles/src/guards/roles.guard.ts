import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '../common/role.enum';

/**
 * Guard: RolesGuard
 * -----------------
 * Checks the @Roles metadata on resolvers against the role in
 * the JWT payload. Grants access if no roles are required or
 * the user's role matches.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
