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
 * Global exception filter that re-throws known GraphQL errors
 * and HttpExceptions, converting unexpected errors into an
 * InternalServerErrorException.
 */
@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown) {
    if (exception instanceof GraphQLError) throw exception;
    if (exception instanceof HttpException) throw exception;
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
