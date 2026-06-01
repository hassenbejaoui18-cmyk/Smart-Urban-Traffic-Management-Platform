/**
 * File: traffic.module.ts
 * ------------------------
 * Root module for the Traffic service. Wires together GraphQL,
 * JWT auth, Passport, Prisma, and scheduled task support.
 *
 * @returns {TrafficModule}
 */
import { join } from 'path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import ms from 'ms';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { DensityResolver } from './density.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from './providers/prisma.module';
import { RolesGuard } from './guards/roles.guard';
import { TrafficService } from './traffic.service';
import { VehicleClientService } from './providers/vehicle-client.service';
import { ZoneResolver } from './zone.resolver';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('TRAFFIC_JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('TRAFFIC_JWT_EXPIRATION') ??
            '24h') as ms.StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [
    ZoneResolver,
    DensityResolver,
    TrafficService,
    VehicleClientService,
    JwtStrategy,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class TrafficModule {}
