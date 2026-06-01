import { Catch, HttpException, InternalServerErrorException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * File: graphql-exception.filter.ts
 * ----------------------------------
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
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
