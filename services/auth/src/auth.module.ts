import { join } from 'path';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import ms from 'ms';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from './providers/prisma.module';
import { RolesGuard } from './guards/roles.guard';

/**
 * Module: AuthModule
 * -----------------
 * Root module for the Auth microservice.
 * Configures GraphQL (code-first), JWT authentication,
 * Passport strategy, Prisma database access, and global
 * exception filtering.
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
        secret: config.get<string>('AUTH_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('AUTH_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [
    AuthResolver,
    AuthService,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class AuthModule {}
