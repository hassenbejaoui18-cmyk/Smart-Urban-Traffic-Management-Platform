# Spec — Unit 3: Traffic Service

## Goal

Build the Traffic microservice (port 4003) with zone management, vehicle density computation, congestion classification (Low / Medium / High), and an optional scheduled task that auto-computes density — all protected by JWT authentication from Unit 1 — so that authenticated users can define traffic zones, compute zone density on demand, and query congestion history.

## Design Decisions

- **Port**: `4003` — consistent with the port plan (Auth 4001, Vehicles 4002, Traffic 4003, Incidents 4004, Notifications 4005).
- **File structure**: Matches Auth and Vehicle service conventions — layered `src/` with `guards/`, `decorators/`, `strategies/`, `providers/`, `entities/`, `dto/`, `common/`, and `prisma/`.
- **GraphQL**: Code-first, same `@nestjs/graphql` + `@nestjs/apollo` setup. Playground enabled in development.
- **Guards**: Local copies of `JwtAuthGuard` and `RolesGuard`. JWT secret read from `TRAFFIC_JWT_SECRET` env var — must match `AUTH_JWT_SECRET` so tokens issued by Auth are accepted.
- **Database**: Prisma v6 with its own PostgreSQL database (`smart_traffic_traffic`).
- **Density classification thresholds**: Configurable via env vars:
  - `TRAFFIC_DENSITY_LOW_MAX` (default `5`) — vehicle count above this moves to Medium.
  - `TRAFFIC_DENSITY_MEDIUM_MAX` (default `20`) — vehicle count above this moves to High.
  - Classification: 0–LowMax = `LOW`, (LowMax+1)–MediumMax = `MEDIUM`, above MediumMax = `HIGH`.
- **CongestionLevel enum**: `LOW`, `MEDIUM`, `HIGH` — stored as a Prisma enum.
- **Zone model**: Zones are named areas with optional boundary data (stored as JSON string). Created by ADMIN only.
- **Density snapshots**: Immutable records — once created, a snapshot is never modified. New computations create new rows.
- **Density computation**: Two triggers:
  1. `computeDensity` mutation — on-demand, triggered by any authenticated user.
  2. Scheduled task via `@nestjs/schedule` — runs periodically (configurable interval, default 5 minutes).
- **Vehicle count source**: The traffic service queries the Vehicle service GraphQL endpoint (`http://localhost:4002/graphql`) to count vehicles per zone. Cross-service communication without the gateway is done via direct HTTP GraphQL requests.
- **Validation**: Same `class-validator` patterns as Auth/Vehicles.
- **Error handling**: Reuses the same `GraphqlExceptionFilter` pattern. Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Naming**: Files `kebab-case`, classes `PascalCase`, GraphQL fields `camelCase`, DB columns `snake_case`.
- **No seed script needed** — zones are created through the API.

## Implementation

### 1. Scaffold Traffic service

Run from the repo root:

```bash
npx @nestjs/cli new services/traffic --package-manager npm --skip-git --strict
```

Delete the generated `app.controller.ts`, `app.controller.spec.ts`, `app.service.ts`, `app.module.ts`, and the `test/` directory.

Replace `services/traffic/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Set `"private": true` in `services/traffic/package.json` (already true from scaffold).

**`services/traffic/src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { TrafficModule } from './traffic.module';

async function bootstrap() {
  const app = await NestFactory.create(TrafficModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.TRAFFIC_PORT ?? 4003);
}
void bootstrap();
```

### 2. Prisma schema

**`services/traffic/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("TRAFFIC_DATABASE_URL")
}

enum CongestionLevel {
  LOW
  MEDIUM
  HIGH
}

model Zone {
  id        String            @id @default(uuid())
  name      String            @unique
  boundary  String?           @db.Text
  snapshots DensitySnapshot[]
  createdAt DateTime          @default(now()) @map("created_at")
  updatedAt DateTime          @updatedAt @map("updated_at")

  @@map("zones")
}

model DensitySnapshot {
  id              String          @id @default(uuid())
  zoneId          String          @map("zone_id")
  zone            Zone            @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  vehicleCount    Int             @map("vehicle_count")
  classification  CongestionLevel
  computedAt      DateTime        @default(now()) @map("computed_at")

  @@index([zoneId, computedAt])
  @@map("density_snapshots")
}
```

Key schema decisions:
- `CongestionLevel` enum — `LOW`, `MEDIUM`, `HIGH`.
- `Zone.name` is unique — no two zones can share the same name.
- `Zone.boundary` is optional (`String?`) — stored as freeform JSON text (e.g., geofence coordinates). Not parsed by the service, just stored for reference.
- `DensitySnapshot` has `vehicleCount` (integer) and `classification` (enum).
- `computedAt` defaults to `now()` — the timestamp of when the computation ran.
- `@@index([zoneId, computedAt])` — optimises density history queries per zone.
- `onDelete: Cascade` on `DensitySnapshot.zone` — deleting a zone removes its snapshots.

Add Prisma scripts to `services/traffic/package.json`:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:seed": "echo 'No seed needed for traffic service'"
```

Also add `@nestjs/schedule` (`^6.1.3`) to the dependencies in `services/traffic/package.json`.

### 3. Prisma module and service

Identical to Auth/Vehicles — create `providers/prisma.module.ts` and `providers/prisma.service.ts`.

**`providers/prisma.module.ts`:**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**`providers/prisma.service.ts`:**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### 4. GraphQL entities

**`entities/congestion-level.enum.ts`** — re-export the Prisma enum for GraphQL:

```typescript
import { registerEnumType } from '@nestjs/graphql';
import { CongestionLevel } from '@prisma/client';

registerEnumType(CongestionLevel, { name: 'CongestionLevel' });

export { CongestionLevel };
```

**`entities/zone.entity.ts`:**

```typescript
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Zone {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  boundary?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
```

**`entities/density-snapshot.entity.ts`:**

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { CongestionLevel } from './congestion-level.enum';

@ObjectType()
export class DensitySnapshot {
  @Field()
  id!: string;

  @Field()
  zoneId!: string;

  @Field(() => Int)
  vehicleCount!: number;

  @Field(() => CongestionLevel)
  classification!: CongestionLevel;

  @Field()
  computedAt!: Date;
}

@ObjectType()
export class ZoneDensity {
  @Field()
  zoneId!: string;

  @Field()
  zoneName!: string;

  @Field(() => Int)
  vehicleCount!: number;

  @Field(() => CongestionLevel)
  classification!: CongestionLevel;

  @Field()
  computedAt!: Date;
}
```

### 5. DTOs

**`dto/create-zone.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateZoneInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  boundary?: string;
}
```

**`dto/compute-density.input.ts`:**

```typescript
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

@InputType()
export class ComputeDensityInput {
  @Field({ nullable: true })
  @IsOptional()
  zoneId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  vehicleCount?: number;
}
```

If `zoneId` is provided, compute for a single zone; if omitted, compute for all zones. If `vehicleCount` is provided, use it directly (bypasses the call to the Vehicle service).

### 6. Auth guards

Copy the same guard/decorator files from Auth or Vehicles, adapted to read `TRAFFIC_JWT_SECRET`:

- **`guards/jwt-auth.guard.ts`** — identical to Auth's `JwtAuthGuard` (extends `AuthGuard('jwt')`).
- **`strategies/jwt.strategy.ts`** — reads `TRAFFIC_JWT_SECRET` from ConfigService.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('TRAFFIC_JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub, role: payload.role };
  }
}
```

- **`guards/roles.guard.ts`** — identical to Auth's `RolesGuard`.
- **`decorators/roles.decorator.ts`** — identical to Auth's `Roles` decorator.
- **`decorators/current-user.decorator.ts`** — identical to Auth's `CurrentUser` decorator.
- **`common/role.enum.ts`** — same local role enum as Vehicles:

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}
```

### 7. Global exception filter

**`common/filters/graphql-exception.filter.ts`** — identical to Auth/Vehicles:

```typescript
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
```

### 8. Vehicle service client

Since the gateway is not yet built, the Traffic service calls the Vehicle service directly via HTTP GraphQL to count vehicles per zone. Create a lightweight client:

**`providers/vehicle-client.service.ts`:**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VehicleClientService {
  private readonly logger = new Logger(VehicleClientService.name);
  private readonly vehicleServiceUrl: string;

  constructor(config: ConfigService) {
    this.vehicleServiceUrl =
      config.get<string>('VEHICLE_SERVICE_URL') ?? 'http://localhost:4002/graphql';
  }

  async countVehiclesByZone(zoneId: string): Promise<number> {
    try {
      const query = `
        query ($filter: VehicleFilterInput) {
          vehicles(filter: $filter) { id }
        }
      `;
      const response = await fetch(this.vehicleServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { filter: { zoneId } } }),
      });

      const data = (await response.json()) as {
        data?: { vehicles?: unknown[] };
      };
      return data?.data?.vehicles?.length ?? 0;
    } catch (error) {
      this.logger.error(`Failed to count vehicles for zone ${zoneId}`, error);
      return 0;
    }
  }

  async countAllVehiclesByZone(): Promise<Record<string, number>> {
    try {
      const query = `
        query {
          vehicles { id zoneId }
        }
      `;
      const response = await fetch(this.vehicleServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = (await response.json()) as {
        data?: { vehicles?: { id: string; zoneId?: string | null }[] };
      };
      const vehicles = data?.data?.vehicles ?? [];
      const counts: Record<string, number> = {};
      for (const v of vehicles) {
        if (v.zoneId) {
          counts[v.zoneId] = (counts[v.zoneId] ?? 0) + 1;
        }
      }
      return counts;
    } catch (error) {
      this.logger.error('Failed to count vehicles by zone', error);
      return {};
    }
  }
}
```

Note: The vehicle client does not send a JWT in internal calls. In a production system, this would use an internal service token. For the prototype, the Vehicle service's `vehicles` query is open to authenticated users; to keep things simple, the internal call skips auth. This is acceptable because:
  - The Vehicle service is not exposed externally (only the gateway will be, in Unit 6).
  - Both services run on localhost in development.

### 9. Traffic service

**`traffic.service.ts`:**

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CongestionLevel } from './entities/congestion-level.enum';
import { VehicleClientService } from './providers/vehicle-client.service';
import { PrismaService } from './providers/prisma.service';

@Injectable()
export class TrafficService {
  private readonly logger = new Logger(TrafficService.name);
  private readonly lowMax: number;
  private readonly mediumMax: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleClient: VehicleClientService,
    config: ConfigService,
  ) {
    this.lowMax = config.get<number>('TRAFFIC_DENSITY_LOW_MAX') ?? 5;
    this.mediumMax = config.get<number>('TRAFFIC_DENSITY_MEDIUM_MAX') ?? 20;
  }

  classify(vehicleCount: number): CongestionLevel {
    if (vehicleCount <= this.lowMax) return CongestionLevel.LOW;
    if (vehicleCount <= this.mediumMax) return CongestionLevel.MEDIUM;
    return CongestionLevel.HIGH;
  }

  async createZone(input: { name: string; boundary?: string }) {
    return this.prisma.zone.create({ data: input });
  }

  async findAllZones() {
    return this.prisma.zone.findMany({ orderBy: { name: 'asc' } });
  }

  async findZone(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async computeDensity(input?: { zoneId?: string; vehicleCount?: number }) {
    if (input?.zoneId && input.vehicleCount !== undefined) {
      const zone = await this.findZone(input.zoneId);
      const classification = this.classify(input.vehicleCount);
      return [
        await this.prisma.densitySnapshot.create({
          data: { zoneId: zone.id, vehicleCount: input.vehicleCount, classification },
        }),
      ];
    }

    if (input?.zoneId) {
      const zone = await this.findZone(input.zoneId);
      const count = await this.vehicleClient.countVehiclesByZone(zone.id);
      const classification = this.classify(count);
      return [
        await this.prisma.densitySnapshot.create({
          data: { zoneId: zone.id, vehicleCount: count, classification },
        }),
      ];
    }

    const zones = await this.prisma.zone.findMany();
    if (zones.length === 0) return [];

    const counts = await this.vehicleClient.countAllVehiclesByZone();

    const snapshots = zones.map((zone) => ({
      zoneId: zone.id,
      vehicleCount: counts[zone.id] ?? 0,
      classification: this.classify(counts[zone.id] ?? 0),
    }));

    await this.prisma.densitySnapshot.createMany({ data: snapshots });

    return this.prisma.densitySnapshot.findMany({
      where: { zoneId: { in: zones.map((z) => z.id) } },
      orderBy: { computedAt: 'desc' },
      take: zones.length,
    });
  }

  async getDensitySnapshots(zoneId?: string) {
    const where = zoneId ? { zoneId } : {};
    return this.prisma.densitySnapshot.findMany({
      where,
      orderBy: { computedAt: 'desc' },
      take: 100,
    });
  }

  async getCurrentDensity(zoneId?: string) {
    const zones = zoneId
      ? [await this.findZone(zoneId)]
      : await this.prisma.zone.findMany();

    const results = await Promise.all(
      zones.map(async (zone) => {
        const latest = await this.prisma.densitySnapshot.findFirst({
          where: { zoneId: zone.id },
          orderBy: { computedAt: 'desc' },
        });
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          vehicleCount: latest?.vehicleCount ?? 0,
          classification: latest?.classification ?? CongestionLevel.LOW,
          computedAt: latest?.computedAt ?? new Date(),
        };
      }),
    );

    return zoneId ? results[0] : results;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledDensityComputation() {
    this.logger.log('Scheduled density computation started');
    await this.computeDensity({});
    this.logger.log('Scheduled density computation completed');
  }
}
```

Ownership and authorization logic:
- Zone creation is restricted to ADMIN via the `@Roles(Role.ADMIN)` decorator on the resolver.
- Zone queries and density computation are open to both ADMIN and OPERATOR.
- No ownership model — zones are global entities shared by all users.

### 10. Zone resolver

**`zone.resolver.ts`:**

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CreateZoneInput } from './dto/create-zone.input';
import { Zone } from './entities/zone.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { TrafficService } from './traffic.service';

@Resolver(() => Zone)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZoneResolver {
  constructor(private readonly trafficService: TrafficService) {}

  @Mutation(() => Zone)
  @Roles(Role.ADMIN)
  async createZone(@Args('input') input: CreateZoneInput) {
    return this.trafficService.createZone(input);
  }

  @Query(() => [Zone])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async zones() {
    return this.trafficService.findAllZones();
  }

  @Query(() => Zone)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async zone(@Args('id') id: string) {
    return this.trafficService.findZone(id);
  }
}
```

### 11. Density resolver

**`density.resolver.ts`:**

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { ComputeDensityInput } from './dto/compute-density.input';
import { DensitySnapshot, ZoneDensity } from './entities/density-snapshot.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { TrafficService } from './traffic.service';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DensityResolver {
  constructor(private readonly trafficService: TrafficService) {}

  @Mutation(() => [DensitySnapshot])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async computeDensity(
    @Args('input', { nullable: true }) input?: ComputeDensityInput,
  ) {
    return this.trafficService.computeDensity(input);
  }

  @Query(() => [DensitySnapshot])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async densitySnapshots(
    @Args('zoneId', { nullable: true }) zoneId?: string,
  ) {
    return this.trafficService.getDensitySnapshots(zoneId);
  }

  @Query(() => [ZoneDensity])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async currentDensity(
    @Args('zoneId', { nullable: true }) zoneId?: string,
  ) {
    return this.trafficService.getCurrentDensity(zoneId);
  }
}
```

### 12. Traffic module

**`traffic.module.ts`:**

```typescript
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
```

Note: `ScheduleModule.forRoot()` is imported to enable the `@Cron` decorator for scheduled density computation.

Note: The scheduled task (`@Cron(CronExpression.EVERY_5_MINUTES)`) is defined inside `TrafficService` above. The schedule interval is configurable by changing the `CronExpression` or by reading an env var. `EVERY_5_MINUTES` is the default.

### 14. Environment file

**`services/traffic/.env`** (create, do not commit):

```env
TRAFFIC_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_traffic
TRAFFIC_JWT_SECRET=dev-secret-change-in-production
TRAFFIC_JWT_EXPIRATION=24h
TRAFFIC_PORT=4003
TRAFFIC_DENSITY_LOW_MAX=5
TRAFFIC_DENSITY_MEDIUM_MAX=20
VEHICLE_SERVICE_URL=http://localhost:4002/graphql
```

`TRAFFIC_JWT_SECRET` must match `AUTH_JWT_SECRET` so that tokens signed by the Auth service are accepted by the Traffic service.

Update `.env.example` at repo root to include Traffic service variables:

```env
# Auth Service
AUTH_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_auth
AUTH_JWT_SECRET=change-me-to-a-random-secret
AUTH_JWT_EXPIRATION=24h
AUTH_PORT=4001

# Vehicle Service
VEHICLE_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_vehicle
VEHICLE_JWT_SECRET=change-me-to-a-random-secret
VEHICLE_JWT_EXPIRATION=24h
VEHICLE_PORT=4002

# Traffic Service
TRAFFIC_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_traffic
TRAFFIC_JWT_SECRET=change-me-to-a-random-secret
TRAFFIC_JWT_EXPIRATION=24h
TRAFFIC_PORT=4003
TRAFFIC_DENSITY_LOW_MAX=5
TRAFFIC_DENSITY_MEDIUM_MAX=20
VEHICLE_SERVICE_URL=http://localhost:4002/graphql
```

### 15. Root package.json scripts

Add to root `package.json`:

```json
"build:traffic": "npm run build -w services/traffic",
"dev:traffic": "npm run start:dev -w services/traffic"
```

## GraphQL API

### `createZone` (mutation)

```graphql
mutation CreateZone($input: CreateZoneInput!) {
  createZone(input: $input) {
    id
    name
    boundary
    createdAt
    updatedAt
  }
}
```

Variables:
```json
{ "input": { "name": "Downtown", "boundary": null } }
```

### `zones` (query)

```graphql
query Zones {
  zones {
    id
    name
    boundary
  }
}
```

### `zone` (query)

```graphql
query Zone($id: String!) {
  zone(id: $id) {
    id
    name
    boundary
    createdAt
  }
}
```

### `computeDensity` (mutation)

```graphql
mutation ComputeDensity($input: ComputeDensityInput) {
  computeDensity(input: $input) {
    id
    zoneId
    vehicleCount
    classification
    computedAt
  }
}
```

Variables:
```json
{ "input": { "zoneId": null, "vehicleCount": null } }
```

To compute for a specific zone with explicit count:
```json
{ "input": { "zoneId": "<uuid>", "vehicleCount": 12 } }
```

### `densitySnapshots` (query)

```graphql
query DensitySnapshots($zoneId: String) {
  densitySnapshots(zoneId: $zoneId) {
    id
    zoneId
    vehicleCount
    classification
    computedAt
  }
}
```

### `currentDensity` (query)

```graphql
query CurrentDensity($zoneId: String) {
  currentDensity(zoneId: $zoneId) {
    zoneId
    zoneName
    vehicleCount
    classification
    computedAt
  }
}
```

## Dependencies

### Runtime

| Package | Purpose |
|---|---|
| `@nestjs/config` | Environment variable loading and validation |
| `@nestjs/graphql` | GraphQL module for NestJS |
| `@nestjs/apollo` | Apollo driver integration |
| `@nestjs/jwt` | JWT verification (mirror of Auth's signing key) |
| `@nestjs/passport` | Passport strategy integration |
| `@nestjs/schedule` | Cron/scheduled task support for density computation |
| `passport` | Authentication middleware |
| `passport-jwt` | JWT strategy for Passport |
| `@prisma/client` | Prisma database client (generated) |
| `prisma` | Prisma CLI (dev dependency) |
| `class-validator` | DTO validation decorators |
| `class-transformer` | DTO transformation |
| `apollo-server-express` | Apollo Server Express (peer dependency) |
| `graphql` | GraphQL runtime |

### Dev dependencies

| Package | Purpose |
|---|---|
| `@types/passport-jwt` | passport-jwt TypeScript types |
| `@nestjs/cli` | nest build / start commands |
| `typescript` | TypeScript compiler |

## Verification Checklist

1. `npm install` at root resolves the new `services/traffic` workspace without errors.
2. `npm run prisma:generate -w services/traffic` generates the Prisma client with `Zone`, `DensitySnapshot` models and `CongestionLevel` enum.
3. Create the `smart_traffic_traffic` database. Run `npm run prisma:migrate -w services/traffic` — the `zones` and `density_snapshots` tables are created with all columns, indexes, and the `CongestionLevel` enum.
4. `npm run start:dev -w services/traffic` starts on port 4003 without errors.
5. Open GraphQL playground at `http://localhost:4003/graphql`.
6. Run `mutation createZone` *without* an `Authorization` header — returns an authentication error.
7. Run `mutation createZone` with a valid ADMIN JWT — returns the created zone with an `id`.
8. Run `mutation createZone` with an OPERATOR JWT — returns a `FORBIDDEN` error (ADMIN-only).
9. Run `mutation createZone` with a duplicate name — returns a unique constraint error.
10. Run `query zones` — returns the list of zones.
11. Run `query zone` with a valid ID — returns the zone details.
12. Run `query zone` with a non-existent ID — returns `NotFoundException`.
13. Run `mutation computeDensity` without a JWT — returns authentication error.
14. Run `mutation computeDensity` with a zoneId and explicit vehicleCount (e.g., 3) — returns a density snapshot with `LOW` classification.
15. Run `mutation computeDensity` with a vehicleCount of 10 — returns `MEDIUM`.
16. Run `mutation computeDensity` with a vehicleCount of 25 — returns `HIGH`.
17. Run `query densitySnapshots` — returns the snapshot history.
18. Run `query currentDensity` — returns the latest classification per zone.
19. Start the Vehicles service, create a vehicle assigned to a zone, run `computeDensity` without explicit vehicleCount — verifies the service queries the Vehicles endpoint and produces a snapshot.
20. Verify scheduled task runs every 5 minutes (check logs for "Scheduled density computation completed").
21. `npm run build -w services/traffic` passes with no TypeScript errors.
