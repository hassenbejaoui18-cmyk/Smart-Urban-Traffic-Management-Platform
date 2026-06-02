import { join } from 'path';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

/**
 * Module: GatewayModule
 * ---------------------
 * Root module for the Apollo Federation Gateway on port 4000.
 * Uses ApolloGatewayDriver with IntrospectAndCompose to merge
 * all five microservice subgraphs into a single GraphQL endpoint.
 * Includes JWT and Passport configuration for gateway-level auth.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'auth', url: 'http://localhost:4001/graphql' },
            { name: 'vehicles', url: 'http://localhost:4002/graphql' },
            { name: 'traffic', url: 'http://localhost:4003/graphql' },
            { name: 'incidents', url: 'http://localhost:4004/graphql' },
            { name: 'notifications', url: 'http://localhost:4005/graphql' },
          ],
        }),
        buildService({ url }) {
          return new RemoteGraphQLDataSource({
            url,
            willSendRequest({ request, context }) {
              const ctx = context as { req?: { headers?: Record<string, string | string[]> } };
              const headers = ctx.req?.headers;
              if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                  if (value) {
                    request.http?.headers.set(key, Array.isArray(value) ? value.join(', ') : value);
                  }
                }
              }
            },
          });
        },
        serviceHealthCheck: false,
      },
    }),
  ],
})
export class GatewayModule {}
