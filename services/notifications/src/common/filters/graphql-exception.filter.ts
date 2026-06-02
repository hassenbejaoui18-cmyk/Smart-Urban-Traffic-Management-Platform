import {
  BadRequestException,
  Catch,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * Filter: GraphqlExceptionFilter
 * ------------------------------
 * Global exception filter that catches unhandled exceptions and
 * returns consistent GraphQL errors. Passes through GraphQLError
 * and HttpException instances; wraps everything else as an
 * InternalServerErrorException.
 */
@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown) {
    if (exception instanceof GraphQLError) throw exception;
    if (exception instanceof HttpException) throw exception;

    // Prisma unique constraint violations → 400 BadRequest
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      (exception as Record<string, unknown>).code === 'P2002'
    ) {
      const meta = (exception as Record<string, unknown>).meta as
        | Record<string, unknown>
        | undefined;
      const target = meta?.target;
      throw new BadRequestException(
        `Unique constraint violation on ${Array.isArray(target) ? (target as string[]).join(', ') : 'field'}`,
      );
    }

    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
