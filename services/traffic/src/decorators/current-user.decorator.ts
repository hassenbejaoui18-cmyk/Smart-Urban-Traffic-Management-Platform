/**
 * File: current-user.decorator.ts
 * --------------------------------
 * Parameter decorator that extracts the authenticated user from
 * the GraphQL request context. Used in resolver method parameters.
 *
 * @returns {CurrentUser}
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
