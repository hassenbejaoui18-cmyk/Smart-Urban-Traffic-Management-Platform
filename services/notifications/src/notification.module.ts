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
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
import { PrismaModule } from './providers/prisma.module';
import { RolesGuard } from './guards/roles.guard';

/**
 * File: notification.module.ts
 * -----------------------------
 * Root module for the Notification microservice.
 * Imports ConfigModule, GraphQLModule (code-first, Apollo),
 * JwtModule, PassportModule, and PrismaModule. Registers
 * the NotificationResolver, NotificationService, JwtStrategy,
 * RolesGuard, and the global GraphQL exception filter.
 */

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
        secret: config.get<string>('NOTIFICATION_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('NOTIFICATION_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [
    NotificationResolver,
    NotificationService,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class NotificationModule {}
