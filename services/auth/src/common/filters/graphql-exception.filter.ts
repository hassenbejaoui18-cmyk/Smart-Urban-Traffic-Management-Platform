import {
  Catch,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * Filter: GraphqlExceptionFilter
 * ------------------------------
 * Global exception filter for GraphQL requests.
 * Re-throws known GraphQL and HTTP exceptions as-is,
 * and converts unknown errors into InternalServerErrorException
 * to avoid leaking internal details.
 */
@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown) {
    if (exception instanceof GraphQLError) throw exception;
    if (exception instanceof HttpException) throw exception;
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
