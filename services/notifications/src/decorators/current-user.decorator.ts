import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * File: current-user.decorator.ts
 * --------------------------------
 * Parameter decorator that extracts the authenticated user
 * payload (sub, role) from the GraphQL request context.
 * The user object is attached by the JwtAuthGuard after
 * successful token verification.
 *
 * @returns {JwtPayload} - The decoded JWT payload containing sub and role.
 */

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
