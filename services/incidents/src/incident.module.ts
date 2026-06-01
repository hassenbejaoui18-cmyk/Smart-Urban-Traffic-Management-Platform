import { join } from 'path';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import ms from 'ms';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { IncidentResolver } from './incident.resolver';

/**
 * Module: IncidentModule
 * ----------------------
 * Root module for the Incident microservice on port 4004.
 * Configures GraphQL (Apollo Federation), JWT authentication,
 * Prisma database access, notification cross-service client,
 * and global exception filtering.
 */
import { IncidentService } from './incident.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationClientService } from './providers/notification-client.service';
import { PrismaModule } from './providers/prisma.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { path: join(process.cwd(), 'src/schema.gql'), federation: 2 },
      playground: true,
    }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('INCIDENT_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('INCIDENT_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [
    IncidentResolver,
    IncidentService,
    NotificationClientService,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class IncidentModule {}
