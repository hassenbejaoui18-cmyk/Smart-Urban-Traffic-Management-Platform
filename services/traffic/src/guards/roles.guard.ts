/**
 * File: roles.guard.ts
 * ---------------------
 * Role-based authorization guard. Reads @Roles() metadata from the
 * resolver handler and checks it against the authenticated user's role.
 * Returns 403 if the user's role is not in the allowed set.
 *
 * @returns {RolesGuard}
 */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as { role: string } | undefined;
    if (!user) return false;

    return roles.includes(user.role);
  }
}
