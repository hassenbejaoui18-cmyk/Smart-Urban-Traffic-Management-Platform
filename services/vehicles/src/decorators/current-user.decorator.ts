import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Decorator: CurrentUser
 * ----------------------
 * Extracts the authenticated user's JwtPayload from the
 * GraphQL request context for use in resolver methods.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const ctx: GqlExecutionContext = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: { user: JwtPayload } }>().req.user;
  },
);
