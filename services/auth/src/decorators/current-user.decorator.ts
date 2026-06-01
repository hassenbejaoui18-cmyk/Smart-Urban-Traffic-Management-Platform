import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

/**
 * Decorator: @CurrentUser
 * -----------------------
 * Extracts the authenticated user from the GraphQL request context.
 * The user object is set by JwtAuthGuard after successful token verification.
 *
 * @returns {User} - The authenticated user's id and role.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const ctx: GqlExecutionContext = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: { user: User } }>().req.user;
  },
);
