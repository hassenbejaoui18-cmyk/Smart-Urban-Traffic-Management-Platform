import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from './jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const ctx: GqlExecutionContext = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: { user: JwtPayload } }>().req.user;
  },
);
