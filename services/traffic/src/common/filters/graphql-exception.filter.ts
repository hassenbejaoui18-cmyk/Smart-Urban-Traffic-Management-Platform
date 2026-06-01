/**
 * File: graphql-exception.filter.ts
 * -----------------------------------
 * Global exception filter that catches all unhandled exceptions
 * and returns consistent GraphQL error responses.
 *
 * @returns {GraphqlExceptionFilter}
 */
import { Catch, HttpException, InternalServerErrorException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown) {
    if (exception instanceof GraphQLError) throw exception;
    if (exception instanceof HttpException) throw exception;
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
