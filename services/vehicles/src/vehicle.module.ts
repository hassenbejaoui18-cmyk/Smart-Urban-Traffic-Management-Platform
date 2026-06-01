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

/**
 * Module: VehicleModule
 * ---------------------
 * Root module for the Vehicle microservice on port 4002.
 * Configures GraphQL (Apollo Federation), JWT authentication,
 * Prisma database access, GPS position resolver, and global
 * exception filtering.
 */
import { GpsPositionResolver } from './gps-position.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from './providers/prisma.module';
import { RolesGuard } from './guards/roles.guard';
import { VehicleResolver } from './vehicle.resolver';
import { VehicleService } from './vehicle.service';

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
        secret: config.get<string>('VEHICLE_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('VEHICLE_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  providers: [
    VehicleResolver,
    VehicleService,
    GpsPositionResolver,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class VehicleModule {}
