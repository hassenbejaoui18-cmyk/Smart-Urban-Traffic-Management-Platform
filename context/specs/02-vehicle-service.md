# Spec — Unit 2: Vehicle Service

## Goal

Build the Vehicle microservice (port 4002) with CRUD for vehicles, GPS position recording, and paginated movement history queries — all protected by JWT authentication from Unit 1 — so that authenticated users can register vehicles, record simulated GPS positions, and retrieve ordered movement histories.

## Design Decisions

- **Port**: `4002` — consistent with the port plan (Auth 4001, Vehicles 4002, Traffic 4003, Incidents 4004, Notifications 4005).
- **File structure**: Matches Auth service conventions — flat `src/` with `entities/`, `dto/`, `common/`, and `prisma/`.
- **GraphQL**: Code-first, same `@nestjs/graphql` + `@nestjs/apollo` setup as Auth. Playground enabled in development.
- **Guards**: Local copies of `JwtAuthGuard` and `RolesGuard` (each service is standalone). JWT secret read from `VEHICLE_JWT_SECRET` env var. The secret value must match Auth's `AUTH_JWT_SECRET` so tokens issued by Auth are accepted.
- **Database**: Prisma v6 with its own PostgreSQL database (`smart_traffic_vehicle`). Each service has its own schema and Prisma client.
- **Vehicle types**: `CAR`, `TRUCK`, `MOTORCYCLE`, `BUS` — stored as a Prisma enum.
- **Ownership model**: Every vehicle has an `ownerId` (string, matches a `users.id` from Auth — no foreign key since it's cross-service). An OPERATOR sees only their own vehicles. An ADMIN sees all vehicles.
- **Movement history ordering**: GPS positions are ordered by `recordedAt` descending (newest first). Pagination is offset-based (`skip`, `take`).
- **Validation**: Same `class-validator` patterns as Auth — `@IsString()`, `@IsEnum()`, `@IsLatitude()`, `@IsLongitude()`, `@IsOptional()`, `@MinLength()`, `@MaxLength()`.
- **Error handling**: Reuses the same `GraphqlExceptionFilter` pattern. Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Naming**: Files `kebab-case`, classes `PascalCase`, GraphQL fields `camelCase`, DB columns `snake_case`.
- **No seed script needed** — vehicles are created through the API, not pre-seeded.

## Implementation

### 1. Scaffold Vehicle service

Run from the repo root:

```bash
npx @nestjs/cli new services/vehicles --package-manager npm --skip-git --strict
```

Delete the generated `app.controller.ts`, `app.controller.spec.ts`, `app.service.ts`, `app.module.ts`, and the `test/` directory.

Replace `services/vehicles/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Set `"private": true` in `services/vehicles/package.json` (already true from scaffold).

**`services/vehicles/src/main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { VehicleModule } from './vehicle.module';

async function bootstrap() {
  const app = await NestFactory.create(VehicleModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.VEHICLE_PORT ?? 4002);
}
void bootstrap();
```

### 2. Prisma schema

**`services/vehicles/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("VEHICLE_DATABASE_URL")
}

enum VehicleType {
  CAR
  TRUCK
  MOTORCYCLE
  BUS
}

model Vehicle {
  id           String        @id @default(uuid())
  licensePlate String        @unique @map("license_plate")
  type         VehicleType
  zoneId       String?       @map("zone_id")
  ownerId      String        @map("owner_id")
  positions    GpsPosition[]
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  @@map("vehicles")
}

model GpsPosition {
  id         String   @id @default(uuid())
  vehicleId  String   @map("vehicle_id")
  vehicle    Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  latitude   Float
  longitude  Float
  recordedAt DateTime @map("recorded_at")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([vehicleId, recordedAt])
  @@map("gps_positions")
}
```

Key schema decisions:
- `VehicleType` enum — `CAR`, `TRUCK`, `MOTORCYCLE`, `BUS`.
- `licensePlate` is unique — no two vehicles can share the same plate.
- `zoneId` is optional (`String?`) — a vehicle may not yet be assigned to a zone.
- `ownerId` is a plain `String` — no foreign key constraint since the `users` table lives in Auth's database.
- `GpsPosition.recordedAt` is non-nullable (Invariant 2). Positions without timestamps are rejected at the validation level.
- `@@index([vehicleId, recordedAt])` — optimises the movement history query.
- `onDelete: Cascade` on `GpsPosition.vehicle` — deleting a vehicle removes its positions.

Add Prisma scripts to `services/vehicles/package.json`:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:seed": "echo 'No seed needed for vehicle service'"
```

### 3. Prisma module and service

Identical to Auth — create `prisma.module.ts` and `prisma.service.ts` following the same pattern.

**`prisma.module.ts`:**

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

**`prisma.service.ts`:**

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

**`entities/vehicle-type.enum.ts`** — re-export the Prisma enum for GraphQL:

```typescript
import { registerEnumType } from '@nestjs/graphql';
import { VehicleType } from '@prisma/client';

registerEnumType(VehicleType, { name: 'VehicleType' });

export { VehicleType };
```

**`entities/vehicle.entity.ts`:**

```typescript
import { Field, ObjectType } from '@nestjs/graphql';
import { VehicleType } from './vehicle-type.enum';

@ObjectType()
export class Vehicle {
  @Field()
  id!: string;

  @Field()
  licensePlate!: string;

  @Field(() => VehicleType)
  type!: VehicleType;

  @Field({ nullable: true })
  zoneId?: string;

  @Field()
  ownerId!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
```

**`entities/gps-position.entity.ts`:**

```typescript
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GpsPosition {
  @Field()
  id!: string;

  @Field()
  vehicleId!: string;

  @Field()
  latitude!: number;

  @Field()
  longitude!: number;

  @Field()
  recordedAt!: Date;
}
```

**`entities/movement-history-pagination.entity.ts`** — wrapper for paginated response:

```typescript
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GpsPosition } from './gps-position.entity';

@ObjectType()
export class MovementHistoryPagination {
  @Field(() => [GpsPosition])
  items!: GpsPosition[];

  @Field(() => Int)
  total!: number;
}
```

### 5. DTOs

**`dto/create-vehicle.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VehicleType } from '../entities/vehicle-type.enum';

@InputType()
export class CreateVehicleInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  licensePlate!: string;

  @Field(() => VehicleType)
  @IsEnum(VehicleType)
  type!: VehicleType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;
}
```

**`dto/record-gps-position.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

@InputType()
export class RecordGpsPositionInput {
  @Field()
  @IsLatitude()
  latitude!: number;

  @Field()
  @IsLongitude()
  longitude!: number;

  @Field({ nullable: true })
  @IsOptional()
  recordedAt?: Date;
}
```

If `recordedAt` is omitted, the service will default it to `new Date()`.

**`dto/vehicle-filter.input.ts`:**

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../entities/vehicle-type.enum';

@InputType()
export class VehicleFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @Field(() => VehicleType, { nullable: true })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;
}
```

**`dto/pagination.input.ts`** — shared pagination parameters:

```typescript
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  take?: number;
}
```

### 6. Auth guards

Copy the same guard/decorator files from Auth, adapted to read `VEHICLE_JWT_SECRET`:

**`jwt-auth.guard.ts`** — identical to Auth's `JwtAuthGuard` (extends `AuthGuard('jwt')`).

**`jwt.strategy.ts`** — reads `VEHICLE_JWT_SECRET` from ConfigService (the value must match Auth's `AUTH_JWT_SECRET`):

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('VEHICLE_JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub, role: payload.role } as JwtPayload;
  }
}
```

**`roles.guard.ts`** — identical to Auth's `RolesGuard` (uses `GqlExecutionContext`, reads `roles` metadata from `Reflector`).

**`roles.decorator.ts`** — identical to Auth's `Roles` decorator.

**`current-user.decorator.ts`** — identical to Auth's `CurrentUser` decorator (uses `GqlExecutionContext`).

Note: The `Role` enum import won't exist in the Vehicle service's Prisma client since it's defined only in Auth's schema. Instead of importing from `@prisma/client`, the guard and decorator should use a local role definition. Create a minimal enum/type:

**`common/role.enum.ts`:**

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}
```

Update `jwt.strategy.ts` to import `Role` from `./common/role.enum` instead of `@prisma/client`.

Update `roles.guard.ts` and `roles.decorator.ts` similarly.

### 7. Global exception filter

**`common/filters/graphql-exception.filter.ts`** — identical to Auth's filter:

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

### 8. Vehicle module

**`vehicle.module.ts`:**

```typescript
import { join } from 'path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import ms from 'ms';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from './prisma.module';
import { RolesGuard } from './roles.guard';
import { VehicleResolver } from './vehicle.resolver';
import { VehicleService } from './vehicle.service';
import { GpsPositionResolver } from './gps-position.resolver';

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
```

### 9. Vehicle service

**`vehicle.service.ts`:**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from './common/role.enum';
import { CreateVehicleInput } from './dto/create-vehicle.input';
import { PaginationInput } from './dto/pagination.input';
import { RecordGpsPositionInput } from './dto/record-gps-position.input';
import { VehicleFilterInput } from './dto/vehicle-filter.input';
import { PrismaService } from './prisma.service';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateVehicleInput, ownerId: string) {
    return this.prisma.vehicle.create({
      data: {
        licensePlate: input.licensePlate,
        type: input.type,
        zoneId: input.zoneId ?? null,
        ownerId,
      },
    });
  }

  async findAll(filter: VehicleFilterInput | null, currentUserId: string, currentUserRole: Role) {
    const where: Record<string, unknown> = {};
    if (filter?.zoneId) where.zoneId = filter.zoneId;
    if (filter?.type) where.type = filter.type;
    if (currentUserRole !== Role.ADMIN) where.ownerId = currentUserId;

    return this.prisma.vehicle.findMany({ where });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async recordPosition(vehicleId: string, input: RecordGpsPositionInput) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.gpsPosition.create({
      data: {
        vehicleId,
        latitude: input.latitude,
        longitude: input.longitude,
        recordedAt: input.recordedAt ?? new Date(),
      },
    });
  }

  async getMovementHistory(vehicleId: string, pagination: PaginationInput, currentUserId: string, currentUserRole: Role) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (currentUserRole !== Role.ADMIN && vehicle.ownerId !== currentUserId) {
      throw new NotFoundException('Vehicle not found');
    }

    const [items, total] = await Promise.all([
      this.prisma.gpsPosition.findMany({
        where: { vehicleId },
        orderBy: { recordedAt: 'desc' },
        skip: pagination.skip ?? 0,
        take: pagination.take ?? 20,
      }),
      this.prisma.gpsPosition.count({ where: { vehicleId } }),
    ]);

    return { items, total };
  }
}
```

Ownership enforcement logic:
- `findAll` — ADMIN sees all vehicles; OPERATOR sees only vehicles where `ownerId` matches their ID.
- `findOne` — returns the vehicle if it exists (ownership enforced at resolver level via a guard).
- `recordPosition` — ownership enforced at resolver level.
- `getMovementHistory` — checks ownership inside the service. If the caller is not ADMIN and does not own the vehicle, throws `NotFoundException` (same error as "not found" to avoid leaking existence info to unauthorized users).

### 10. Vehicle resolver

**`vehicle.resolver.ts`:**

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './current-user.decorator';
import { CreateVehicleInput } from './dto/create-vehicle.input';
import { VehicleFilterInput } from './dto/vehicle-filter.input';
import { Vehicle } from './entities/vehicle.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { VehicleService } from './vehicle.service';

@Resolver(() => Vehicle)
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleResolver {
  constructor(private readonly vehicleService: VehicleService) {}

  @Mutation(() => Vehicle)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async createVehicle(
    @Args('input') input: CreateVehicleInput,
    @CurrentUser() user: { sub: string; role: Role },
  ) {
    return this.vehicleService.create(input, user.sub);
  }

  @Query(() => [Vehicle])
  @Roles(Role.ADMIN, Role.OPERATOR)
  async vehicles(
    @Args('filter', { nullable: true }) filter: VehicleFilterInput | null,
    @CurrentUser() user: { sub: string; role: Role },
  ) {
    return this.vehicleService.findAll(filter, user.sub, user.role);
  }

  @Query(() => Vehicle)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async vehicle(@Args('id') id: string) {
    return this.vehicleService.findOne(id);
  }
}
```

### 11. GPS position resolver

**`gps-position.resolver.ts`:**

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from './common/role.enum';
import { CurrentUser } from './current-user.decorator';
import { PaginationInput } from './dto/pagination.input';
import { RecordGpsPositionInput } from './dto/record-gps-position.input';
import { GpsPosition } from './entities/gps-position.entity';
import { MovementHistoryPagination } from './entities/movement-history-pagination.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { VehicleService } from './vehicle.service';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GpsPositionResolver {
  constructor(private readonly vehicleService: VehicleService) {}

  @Mutation(() => GpsPosition)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async recordGpsPosition(
    @Args('vehicleId') vehicleId: string,
    @Args('input') input: RecordGpsPositionInput,
    @CurrentUser() user: { sub: string; role: Role },
  ) {
    return this.vehicleService.recordPosition(vehicleId, input);
  }

  @Query(() => MovementHistoryPagination)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async movementHistory(
    @Args('vehicleId') vehicleId: string,
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @CurrentUser() user: { sub: string; role: Role },
  ) {
    return this.vehicleService.getMovementHistory(
      vehicleId,
      pagination ?? {},
      user.sub,
      user.role,
    );
  }
}
```

### 12. Environment file

**`services/vehicles/.env`** (create, do not commit):

```env
VEHICLE_DATABASE_URL=postgresql://user:password@localhost:5432/smart_traffic_vehicle
VEHICLE_JWT_SECRET=dev-secret-change-in-production
VEHICLE_JWT_EXPIRATION=24h
VEHICLE_PORT=4002
```

`VEHICLE_JWT_SECRET` must match `AUTH_JWT_SECRET` so that tokens signed by the Auth service are accepted by the Vehicle service.

Update `.env.example` at repo root to include Vehicle service variables:

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
```

## GraphQL API

### `createVehicle` (mutation)

```graphql
mutation CreateVehicle($input: CreateVehicleInput!) {
  createVehicle(input: $input) {
    id
    licensePlate
    type
    zoneId
    ownerId
    createdAt
    updatedAt
  }
}
```

Variables:
```json
{ "input": { "licensePlate": "123-ABC", "type": "CAR", "zoneId": null } }
```

### `vehicles` (query)

```graphql
query Vehicles($filter: VehicleFilterInput) {
  vehicles(filter: $filter) {
    id
    licensePlate
    type
    zoneId
    ownerId
  }
}
```

Variables:
```json
{ "filter": { "type": "CAR" } }
```

### `vehicle` (query)

```graphql
query Vehicle($id: String!) {
  vehicle(id: $id) {
    id
    licensePlate
    type
    zoneId
    ownerId
  }
}
```

### `recordGpsPosition` (mutation)

```graphql
mutation RecordGpsPosition($vehicleId: String!, $input: RecordGpsPositionInput!) {
  recordGpsPosition(vehicleId: $vehicleId, input: $input) {
    id
    vehicleId
    latitude
    longitude
    recordedAt
  }
}
```

Variables:
```json
{ "vehicleId": "<uuid>", "input": { "latitude": 36.7538, "longitude": 3.0589, "recordedAt": null } }
```

### `movementHistory` (query)

```graphql
query MovementHistory($vehicleId: String!, $pagination: PaginationInput) {
  movementHistory(vehicleId: $vehicleId, pagination: $pagination) {
    items { id latitude longitude recordedAt }
    total
  }
}
```

Variables:
```json
{ "vehicleId": "<uuid>", "pagination": { "skip": 0, "take": 10 } }
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

1. `npm install` at root resolves the new `services/vehicles` workspace without errors.
2. `npm run prisma:generate -w services/vehicles` generates the Prisma client with `Vehicle`, `GpsPosition` models and `VehicleType` enum.
3. Create the `smart_traffic_vehicle` database. Run `npm run prisma:migrate -w services/vehicles` — the `vehicles` and `gps_positions` tables are created with all columns, indexes, and the `VehicleType` enum.
4. `npm run start:dev -w services/vehicles` starts on port 4002 without errors.
5. Open GraphQL playground at `http://localhost:4002/graphql`.
6. Run `mutation createVehicle` *without* an `Authorization` header — returns an authentication error.
7. Run `mutation createVehicle` with a valid JWT from Auth and valid input — returns the created vehicle with an `id` and correct `ownerId`.
8. Run `mutation createVehicle` with a duplicate `licensePlate` — returns a conflict or unique constraint error.
9. Run `mutation createVehicle` with an invalid `type` value — returns a validation error.
10. Run `query vehicles` — returns the list of vehicles (for OPERATOR, only their own; for ADMIN, all).
11. Run `query vehicle` with a valid ID — returns the vehicle details.
12. Run `query vehicle` with a non-existent ID — returns `NotFoundException`.
13. Run `mutation recordGpsPosition` with a valid `vehicleId`, latitude, and longitude — returns the created GPS position with a `recordedAt` timestamp.
14. Run `mutation recordGpsPosition` with an invalid latitude (e.g., 200) — returns a validation error.
15. Run `query movementHistory` for a vehicle that has positions — returns a paginated list sorted by `recordedAt` descending, with a `total` count.
16. Run `query movementHistory` for a non-existent vehicle — returns `NotFoundException`.
17. Run `query movementHistory` for a vehicle owned by another OPERATOR (as OPERATOR) — returns `NotFoundException`.
